import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  detected: boolean;
  distance?: number; // Distancia del rostro al centro del círculo guía
  size?: number; // Tamaño del rostro detectado (0-1)
  sharpness?: number; // Nitidez estimada (0-1)
  isValid?: boolean; // Si cumple todos los criterios
  message?: string; // Mensaje de instrucción
  box?: { x: number; y: number; width: number; height: number }; // Coordenadas del rostro detectado
}

/**
 * Servicio para detección facial usando face-api.js
 * Principio de Responsabilidad Única: Solo maneja la detección y validación facial
 */
@Injectable({
  providedIn: 'root',
})
export class FaceDetectionService {
  private modelsLoaded = false;
  private readonly modelsPath = '/models';
  private readonly minFaceSize = 0.15; // Tamaño mínimo del rostro (15% del frame)
  private readonly maxFaceSize = 0.75; // Tamaño máximo del rostro (75% del frame)
  private readonly optimalFaceSize = 0.5; // Tamaño óptimo (50% del frame)
  private readonly maxDistance = 0.15; // Distancia máxima del centro (15% del frame)
  private readonly minSharpness = 0.2; // Nitidez mínima requerida (más permisiva)

  /**
   * Carga los modelos de face-api.js
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) {
      console.log('Modelos ya cargados');
      return;
    }

    try {
      console.log('Cargando modelos de face-api.js desde:', this.modelsPath);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelsPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelsPath),
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelsPath),
      ]);
      this.modelsLoaded = true;
      console.log('Modelos cargados correctamente');
    } catch (error) {
      console.error('Error loading face-api models:', error);
      this.modelsLoaded = false;
      throw new Error('No se pudieron cargar los modelos de reconocimiento facial');
    }
  }

  /**
   * Detecta rostros en un elemento video
   */
  async detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    if (!video || !video.videoWidth || !video.videoHeight) {
      return {
        detected: false,
        message: 'El video no está listo',
      };
    }

    try {
      // Configurar opciones de detección más sensibles
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320, // equilibrio velocidad/precisión
        scoreThreshold: 0.2, // más sensible
      });

      let detectionResult = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detectionResult) {
        const multiDetections = await faceapi
          .detectAllFaces(video, options)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (multiDetections.length === 0) {
          // Fallback adicional: usar ssdMobilenetv1
          const ssdResult = await faceapi
            .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (!ssdResult) {
            return {
              detected: false,
              message: 'No se detectó ningún rostro. Asegúrate de estar frente a la cámara.',
            };
          }

          detectionResult = ssdResult;
        } else {
          detectionResult = multiDetections.reduce((best, current) => {
            if (!best) return current;
            return current.detection.score > best.detection.score ? current : best;
          });
        }
      }

      const { detection, landmarks } = detectionResult;
      if (!detection || !landmarks) {
        return {
          detected: false,
          message: 'No se pudo detectar el rostro correctamente',
        };
      }

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Calcular posición del rostro
      const faceBox = detection.box;
      const faceCenterX = faceBox.x + faceBox.width / 2;
      const faceCenterY = faceBox.y + faceBox.height / 2;

      // Centro del video (donde debe estar el rostro)
      const videoCenterX = videoWidth / 2;
      const videoCenterY = videoHeight / 2;

      // Calcular distancia del centro
      const distanceX = Math.abs(faceCenterX - videoCenterX) / videoWidth;
      const distanceY = Math.abs(faceCenterY - videoCenterY) / videoHeight;
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

      // Calcular tamaño del rostro (normalizado)
      const faceSize = Math.max(faceBox.width / videoWidth, faceBox.height / videoHeight);

      // Calcular nitidez estimada usando landmarks
      const sharpness = this.calculateSharpness(landmarks, faceBox);

      // Validar criterios
      const isCentered = distance <= this.maxDistance;
      const isSizeValid = faceSize >= this.minFaceSize && faceSize <= this.maxFaceSize;
      const isSizeOptimal = Math.abs(faceSize - this.optimalFaceSize) < 0.05;
      // Respaldo de nitidez con score de detección para evitar 0 permanentes
      const effectiveSharpness = Math.max(sharpness, Math.min(1, detection.score));
      const isSharp = effectiveSharpness >= this.minSharpness || detection.score >= 0.7;

      const isValid = isCentered && isSizeValid && isSharp;

      console.debug('Resultado detección facial', {
        score: detection.score,
        distance,
        size: faceSize,
        sharpness,
        effectiveSharpness,
        isCentered,
        isSizeValid,
        isSharp,
      });

      // Generar mensaje de instrucción
      let message = '';
      if (!isCentered) {
        message = 'Centra tu rostro';
      } else if (faceSize < this.minFaceSize) {
        message = 'Acércate a la cámara';
      } else if (faceSize > this.maxFaceSize) {
        message = 'Aléjate de la cámara';
      } else if (!isSizeOptimal) {
        if (faceSize < this.optimalFaceSize) {
          message = 'Acércate un poco más';
        } else {
          message = 'Aléjate un poco';
        }
      } else if (!isSharp) {
        message = 'Mantén la cámara estable';
      } else {
        message = 'Perfecto, mantén esta posición';
      }

      return {
        detected: true,
        distance,
        size: faceSize,
        sharpness,
        isValid,
        message,
        box: {
          x: faceBox.x,
          y: faceBox.y,
          width: faceBox.width,
          height: faceBox.height,
        },
      };
    } catch (error) {
      console.error('Error en detección facial:', error);
      return {
        detected: false,
        message: 'Error al detectar el rostro. Intenta de nuevo.',
      };
    }
  }

  /**
   * Calcula la nitidez estimada basándose en la consistencia de los landmarks
   * Usa la distancia promedio entre landmarks adyacentes como indicador de nitidez
   */
  private calculateSharpness(landmarks: faceapi.FaceLandmarks68, faceBox: faceapi.Box): number {
    const positions = landmarks.positions;
    if (positions.length < 2) return 0.5;

    // Calcular distancias entre landmarks adyacentes
    // En una imagen nítida, estas distancias deberían ser consistentes
    const distances: number[] = [];
    for (let i = 0; i < positions.length - 1; i++) {
      const dx = positions[i + 1].x - positions[i].x;
      const dy = positions[i + 1].y - positions[i].y;
      distances.push(Math.sqrt(dx * dx + dy * dy));
    }

    // Calcular desviación estándar de las distancias
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // Normalizar: menor desviación = mayor nitidez
    // Usar el tamaño del rostro como referencia
    const faceDiag = Math.max(1, Math.sqrt(faceBox.width * faceBox.width + faceBox.height * faceBox.height));
    const normalizedStdDev = Math.min(stdDev / (faceDiag * 0.1), 1);

    // Convertir a score de nitidez (0-1)
    // Score más alto = más nítido
    const score = 1 - normalizedStdDev * 2;
    // Evitar clamp en 0 duro para no bloquear validaciones
    return Math.max(0.05, Math.min(1, score));
  }

  /**
   * Extrae descriptor facial (128 floats) desde un elemento HTML (video o imagen)
   */
  async getDescriptorFromElement(el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }
    if (!el) return null;

    try {
      const det = await faceapi
        .detectSingleFace(el, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!det || !det.descriptor) return null;
      return det.descriptor;
    } catch {
      return null;
    }
  }

  /**
   * Lee un File/Blob imagen y devuelve descriptor (128 floats)
   */
  async getDescriptorFromFile(file: File | Blob): Promise<Float32Array | null> {
    if (!file) return null;
    const img = await this.readImage(file);
    if (!img) return null;
    const descriptor = await this.getDescriptorFromElement(img);
    // Liberar recurso
    URL.revokeObjectURL(img.src);
    return descriptor;
  }

  private async readImage(file: File | Blob): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }
}


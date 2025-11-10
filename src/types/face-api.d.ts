declare module 'face-api.js' {
  export interface Point {
    x: number;
    y: number;
  }

  export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface FaceDetection {
    score: number;
    box: Box;
  }

  export interface FaceLandmarks {
    positions: Point[];
  }

  export interface FaceLandmarks68 extends FaceLandmarks {
    positions: Point[];
  }

  export interface WithFaceDetection {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks {
    landmarks: FaceLandmarks;
  }

  export interface WithFaceDescriptor {
    descriptor: Float32Array;
  }

  export type FaceDetectionResult = WithFaceDetection & WithFaceLandmarks & WithFaceDescriptor;

  /**
   * Declaration merging intencional para compatibilidad con face-api.js
   * La librería usa el mismo nombre para la interfaz (tipo) y la clase (constructor)
   * Esto permite usar TinyFaceDetectorOptions tanto como tipo como constructor:
   * - const opts: TinyFaceDetectorOptions = { inputSize: 320 }
   * - const instance = new TinyFaceDetectorOptions(opts)
   */
  /* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- Necesario para compatibilidad con face-api.js */
  export interface TinyFaceDetectorOptions {
    inputSize?: number;
    scoreThreshold?: number;
  }

  export interface SsdMobilenetv1Options {
    minConfidence?: number;
  }

  export class TinyFaceDetectorOptions {
    constructor(options?: TinyFaceDetectorOptions);
  }

  export class SsdMobilenetv1Options {
    constructor(options?: SsdMobilenetv1Options);
  }
  /* eslint-enable @typescript-eslint/no-unsafe-declaration-merging */

  export interface FaceDetectionChain {
    withFaceLandmarks(): FaceDetectionChain;
    withFaceDescriptor(): Promise<FaceDetectionResult>;
  }

  export interface FaceDetectionAllChain {
    withFaceLandmarks(): FaceDetectionAllChain;
    withFaceDescriptors(): Promise<FaceDetectionResult[]>;
  }

  export interface Nets {
    tinyFaceDetector: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceLandmark68TinyNet: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceRecognitionNet: {
      loadFromUri(uri: string): Promise<void>;
    };
    ssdMobilenetv1: {
      loadFromUri(uri: string): Promise<void>;
    };
  }

  export const nets: Nets;

  export function detectSingleFace(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    options?: TinyFaceDetectorOptions | SsdMobilenetv1Options
  ): FaceDetectionChain;

  export function detectAllFaces(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    options?: TinyFaceDetectorOptions | SsdMobilenetv1Options
  ): FaceDetectionAllChain;
}

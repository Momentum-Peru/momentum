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

  export interface WithFaceDetection<T> {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks<T> {
    landmarks: FaceLandmarks;
  }

  export interface WithFaceDescriptor<T> {
    descriptor: Float32Array;
  }

  export type FaceDetectionResult = WithFaceDetection<{}> &
    WithFaceLandmarks<WithFaceDetection<{}>> &
    WithFaceDescriptor<WithFaceLandmarks<WithFaceDetection<{}>>>;

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

  export interface FaceDetectionChain {
    withFaceLandmarks(): any;
    withFaceDescriptor(): Promise<FaceDetectionResult>;
  }

  export interface FaceDetectionAllChain {
    withFaceLandmarks(): any;
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


declare module 'jszip' {
  class JSZip {
    file(name: string, content: Blob | string): this;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
  }
  export = JSZip;
}

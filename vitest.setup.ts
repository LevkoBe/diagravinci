class MockCanvasRenderingContext2D {
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  strokeStyle: string | CanvasGradient | CanvasPattern = "#000000";
  lineWidth: number = 1;
  lineCap: CanvasLineCap = "butt";
  lineJoin: CanvasLineJoin = "miter";
  font: string = "10px sans-serif";
  textAlign: CanvasTextAlign = "left";
  textBaseline: CanvasTextBaseline = "alphabetic";
  globalAlpha: number = 1;
  globalCompositeOperation: GlobalCompositeOperation = "source-over";
  shadowBlur: number = 0;
  shadowColor: string = "rgba(0, 0, 0, 0)";
  shadowOffsetX: number = 0;
  shadowOffsetY: number = 0;

  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  closePath(): void {}
  arc(): void {}
  arcTo(): void {}
  rect(): void {}
  fill(): void {}
  stroke(): void {}
  clip(): void {}
  clearRect(): void {}
  fillRect(): void {}
  strokeRect(): void {}
  fillText(): void {}
  strokeText(): void {}
  measureText(): TextMetrics {
    return { width: 0 } as TextMetrics;
  }
  drawImage(): void {}
  createImageData(): ImageData {
    return {
      data: new Uint8ClampedArray(),
      width: 0,
      height: 0,
      colorSpace: "srgb",
    };
  }
  getImageData(): ImageData {
    return {
      data: new Uint8ClampedArray(),
      width: 0,
      height: 0,
      colorSpace: "srgb",
    };
  }
  putImageData(): void {}
  createLinearGradient(): CanvasGradient {
    return {
      addColorStop: (): void => {},
    } as unknown as CanvasGradient;
  }
  createRadialGradient(): CanvasGradient {
    return {
      addColorStop: (): void => {},
    } as unknown as CanvasGradient;
  }
  createPattern(): CanvasPattern | null {
    return null;
  }
  scale(): void {}
  rotate(): void {}
  translate(): void {}
  transform(): void {}
  setTransform(): void {}
  resetTransform(): void {}
  save(): void {}
  restore(): void {}
  isPointInPath(): boolean {
    return false;
  }
  isPointInStroke(): boolean {
    return false;
  }
}

interface CanvasWithMockContext extends HTMLCanvasElement {
  _context?: MockCanvasRenderingContext2D;
}

if (typeof window !== "undefined") {
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function <K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElementCreationOptions,
  ): HTMLElementTagNameMap[K] {
    if (tagName.toLowerCase() === "canvas") {
      const canvas = originalCreateElement(
        tagName,
        options,
      ) as CanvasWithMockContext;
      canvas.width = 300;
      canvas.height = 150;
      canvas.getContext = function (
        this: CanvasWithMockContext,
        contextType: string,
        _options?: CanvasRenderingContext2DSettings,
      ): CanvasRenderingContext2D | null {
        if (contextType === "2d") {
          if (!this._context) {
            this._context = new MockCanvasRenderingContext2D();
          }
          return this._context as unknown as CanvasRenderingContext2D;
        }
        return null;
      } as HTMLCanvasElement["getContext"];
      canvas.toDataURL = function (
        _type?: string,
        _quality?: number,
      ): string {
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      };
      canvas.toBlob = function (
        callback: BlobCallback,
        _type?: string,
        _quality?: number,
      ): void {
        callback(new Blob([], { type: "image/png" }));
      };
      Object.defineProperty(canvas, "offsetWidth", {
        value: 800,
        writable: true,
      });
      Object.defineProperty(canvas, "offsetHeight", {
        value: 600,
        writable: true,
      });
      return canvas as HTMLElementTagNameMap[K];
    }
    return originalCreateElement(tagName, options);
  } as typeof document.createElement;

  if (!window.CanvasRenderingContext2D) {
    (window as Window & { CanvasRenderingContext2D: unknown }).CanvasRenderingContext2D =
      MockCanvasRenderingContext2D;
  }
}

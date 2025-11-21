// src/utils/faceRecognition.js
export class FaceRecognitionSystem {
  constructor() {
    this.faceapi = null;
    this.modelsLoaded = false;
    this.MODEL_URL = '/models'; // Points to public/models folder
    this.loadingPromise = null;
  }

  async loadModels() {
    // Prevent multiple simultaneous loads
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        console.log('Starting to load face recognition models...');
        
        // Dynamically import face-api.js
        this.faceapi = await import('face-api.js');
        console.log('Face-API.js imported successfully');

        // Load models from public/models directory
        console.log('Loading models from:', this.MODEL_URL);
        
        await this.faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL);
        console.log('✓ Tiny Face Detector loaded');
        
        await this.faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL);
        console.log('✓ Face Landmark 68 loaded');
        
        await this.faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL);
        console.log('✓ Face Recognition Net loaded');

        this.modelsLoaded = true;
        console.log('🎉 All face recognition models loaded successfully');
        return true;
        
      } catch (error) {
        console.error('❌ Error loading face recognition models:', error);
        this.modelsLoaded = false;
        return false;
      }
    })();

    return this.loadingPromise;
  }

  async detectFace(videoElement) {
    if (!this.modelsLoaded || !this.faceapi) {
      throw new Error('Face recognition models not loaded. Call loadModels() first.');
    }

    try {
      const detection = await this.faceapi
        .detectSingleFace(videoElement, new this.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection;
    } catch (error) {
      console.error('Error detecting face:', error);
      throw new Error('Face detection failed: ' + error.message);
    }
  }

  async recognizeFace(videoElement, storedDescriptors) {
    if (!storedDescriptors || storedDescriptors.length === 0) {
      throw new Error('No stored face descriptors provided for recognition');
    }

    const detection = await this.detectFace(videoElement);
    
    if (!detection) {
      return null;
    }

    // Find the best match among stored descriptors
    let bestMatch = null;
    let bestDistance = Infinity;
    const MATCH_THRESHOLD = 0.6; // Adjust this value as needed

    storedDescriptors.forEach(descriptor => {
      if (!descriptor.faceDescriptor) {
        console.warn('Descriptor missing faceDescriptor:', descriptor);
        return;
      }

      const distance = this.faceapi.euclideanDistance(
        detection.descriptor,
        descriptor.faceDescriptor
      );
      
      console.log(`Distance to ${descriptor.firstName}: ${distance}`);
      
      if (distance < bestDistance && distance < MATCH_THRESHOLD) {
        bestDistance = distance;
        bestMatch = {
          ...descriptor,
          distance: distance,
          confidence: (1 - distance) * 100 // Convert to percentage
        };
      }
    });

    if (bestMatch) {
      console.log(`✅ Best match: ${bestMatch.firstName} with distance ${bestMatch.distance}`);
    } else {
      console.log('❌ No match found below threshold');
    }

    return bestMatch;
  }

  // Convert Float32Array descriptor to regular array for JSON storage
  descriptorToArray(descriptor) {
    if (!(descriptor instanceof Float32Array)) {
      throw new Error('Descriptor must be a Float32Array');
    }
    return Array.from(descriptor);
  }

  // Convert array back to Float32Array for face comparison
  arrayToDescriptor(array) {
    if (!Array.isArray(array)) {
      throw new Error('Input must be an array');
    }
    return new Float32Array(array);
  }

  // Check if models are loaded
  isReady() {
    return this.modelsLoaded && this.faceapi !== null;
  }

  // Get model loading status
  getStatus() {
    return {
      modelsLoaded: this.modelsLoaded,
      faceapiAvailable: this.faceapi !== null
    };
  }
}

// Singleton instance - only one instance throughout the app
export const faceRecognition = new FaceRecognitionSystem();
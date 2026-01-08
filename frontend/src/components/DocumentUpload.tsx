import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import type { UserRole, AnalysisResult } from '../types';

interface UploadedFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

interface DocumentUploadProps {
  onAnalysisComplete: (
    result: AnalysisResult,
    targetDocText: string,
    targetDocName: string,
    refDocText?: string,
    refDocName?: string
  ) => void;
}

export default function DocumentUpload({ onAnalysisComplete }: DocumentUploadProps) {
  const [targetDocument, setTargetDocument] = useState<UploadedFile | null>(null);
  const [referenceDocument, setReferenceDocument] = useState<UploadedFile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | ''>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Target document dropzone
  const onDropTarget = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setTargetDocument({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setError(null);
    }
  }, []);

  const {
    getRootProps: getTargetRootProps,
    getInputProps: getTargetInputProps,
    isDragActive: isTargetDragActive,
  } = useDropzone({
    onDrop: onDropTarget,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Reference document dropzone
  const onDropReference = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setReferenceDocument({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
  }, []);

  const {
    getRootProps: getReferenceRootProps,
    getInputProps: getReferenceInputProps,
    isDragActive: isReferenceDragActive,
  } = useDropzone({
    onDrop: onDropReference,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const removeTargetDocument = () => {
    setTargetDocument(null);
    setError(null);
  };

  const removeReferenceDocument = () => {
    setReferenceDocument(null);
  };

  const handleAnalyze = async () => {
    if (!targetDocument) {
      setError('Please upload a target document');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('targetDocument', targetDocument.file);
      if (referenceDocument) {
        formData.append('referenceDocument', referenceDocument.file);
      }
      if (userRole) {
        formData.append('userRole', userRole);
      }

      const response = await fetch('https://railway-up-production-7cf4.up.railway.app/api/upload/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      console.log('Analysis result:', result);

      // Pass analysis result and document texts to parent for display and chat
      onAnalysisComplete(
        result.analysis,
        result.documentTexts.target,
        result.documentTexts.targetName,
        result.documentTexts.reference,
        result.documentTexts.referenceName
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="upload-section" className="py-20 px-6 bg-stone-950 border-t border-stone-900">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-4">
          Start Your Analysis
        </h2>
        <p className="text-bronze-200 text-center mb-12">
          Upload your document and select your role to get started
        </p>

        {/* Target Document Upload */}
        <div className="mb-8">
          <label className="block text-lg font-semibold text-bronze-50 mb-3">
            Document to Analyze <span className="text-bronze-500">*</span>
          </label>

          {!targetDocument ? (
            <div
              {...getTargetRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isTargetDragActive
                  ? 'border-bronze-500 bg-bronze-500/10'
                  : 'border-stone-800 hover:border-bronze-500/50 bg-stone-925'
              }`}
            >
              <input {...getTargetInputProps()} />
              <Upload className="w-12 h-12 text-bronze-500 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-bronze-200 font-medium mb-2">
                {isTargetDragActive ? 'Drop your document here' : 'Drop your document or click to browse'}
              </p>
              <p className="text-bronze-200/60 text-sm">
                Supports PDF, DOCX, TXT up to 50MB
              </p>
            </div>
          ) : (
            <div className="bg-stone-925 border border-stone-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-bronze-500" strokeWidth={1.5} />
                <div>
                  <p className="text-bronze-50 font-medium">{targetDocument.name}</p>
                  <p className="text-bronze-200/60 text-sm">{formatFileSize(targetDocument.size)}</p>
                </div>
              </div>
              <button
                onClick={removeTargetDocument}
                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                aria-label="Remove document"
              >
                <X className="w-5 h-5 text-bronze-200" />
              </button>
            </div>
          )}
        </div>

        {/* Reference Document Upload (Optional) */}
        <div className="mb-8">
          <label className="block text-lg font-semibold text-bronze-50 mb-3">
            Reference Document <span className="text-bronze-200/60 text-sm font-normal">(Optional)</span>
          </label>

          {!referenceDocument ? (
            <div
              {...getReferenceRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isReferenceDragActive
                  ? 'border-bronze-500 bg-bronze-500/10'
                  : 'border-stone-800 hover:border-bronze-500/50 bg-stone-925'
              }`}
            >
              <input {...getReferenceInputProps()} />
              <Upload className="w-8 h-8 text-bronze-500/60 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-bronze-200/80 text-sm mb-1">
                {isReferenceDragActive ? 'Drop reference document' : 'Add governing LPA or term sheet (optional)'}
              </p>
              <p className="text-bronze-200/50 text-xs">
                For comparison against target document
              </p>
            </div>
          ) : (
            <div className="bg-stone-925 border border-stone-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-bronze-500" strokeWidth={1.5} />
                <div>
                  <p className="text-bronze-50 font-medium">{referenceDocument.name}</p>
                  <p className="text-bronze-200/60 text-sm">{formatFileSize(referenceDocument.size)}</p>
                </div>
              </div>
              <button
                onClick={removeReferenceDocument}
                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                aria-label="Remove reference document"
              >
                <X className="w-5 h-5 text-bronze-200" />
              </button>
            </div>
          )}
        </div>

        {/* Role Selection */}
        <div className="mb-8">
          <label className="block text-lg font-semibold text-bronze-50 mb-3">
            Your Role <span className="text-bronze-200/60 text-sm font-normal">(Optional - AI will infer if not selected)</span>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label
              className={`relative flex items-start gap-4 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                userRole === 'gp'
                  ? 'border-bronze-500 bg-bronze-500/10'
                  : 'border-stone-800 bg-stone-925 hover:border-bronze-500/50'
              }`}
            >
              <input
                type="radio"
                name="userRole"
                value="gp"
                checked={userRole === 'gp'}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="mt-1"
              />
              <div>
                <p className="text-bronze-50 font-semibold mb-1">General Partner (GP)</p>
                <p className="text-bronze-200/70 text-sm">
                  Fund manager reviewing LP requests or subscription documents
                </p>
              </div>
            </label>

            <label
              className={`relative flex items-start gap-4 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                userRole === 'lp'
                  ? 'border-bronze-500 bg-bronze-500/10'
                  : 'border-stone-800 bg-stone-925 hover:border-bronze-500/50'
              }`}
            >
              <input
                type="radio"
                name="userRole"
                value="lp"
                checked={userRole === 'lp'}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="mt-1"
              />
              <div>
                <p className="text-bronze-50 font-semibold mb-1">Limited Partner (LP)</p>
                <p className="text-bronze-200/70 text-sm">
                  Investor conducting due diligence on fund documents
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!targetDocument || isAnalyzing}
          className={`w-full py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
            targetDocument && !isAnalyzing
              ? 'bg-bronze-500 hover:bg-bronze-400 text-stone-950 shadow-lg hover:shadow-xl'
              : 'bg-stone-800 text-stone-600 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Document...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Analyze Document
            </>
          )}
        </button>

        <p className="text-center text-bronze-200/60 text-sm mt-4">
          Analysis typically completes in under 45 seconds
        </p>
      </div>
    </section>
  );
}

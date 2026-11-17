import { useRef, useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { signKpiAppraisalAsBlastingEngineer, signKpiAppraisalAsBlastingOfficer } from "../api/kpi";
import { extractErrorMessage } from "../api/client";
import { KpiAppraisalStatus, type KpiAppraisalSummaryDto } from "../types/kpi";

interface KpiSignOffPanelProps {
  appraisal: KpiAppraisalSummaryDto;
  hasSavedSignature: boolean;
  onSigned: () => void;
  onError: (message: string) => void;
}

export function KpiSignOffPanel({ appraisal, hasSavedSignature, onSigned, onError }: KpiSignOffPanelProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  const role = appraisal.status === KpiAppraisalStatus.InProgress ? "Blasting Officer" : "Blasting Engineer";

  async function submit(signaturePngBase64?: string) {
    setIsSigning(true);
    setLocalError(null);
    try {
      if (appraisal.status === KpiAppraisalStatus.InProgress) {
        await signKpiAppraisalAsBlastingOfficer(appraisal.id, { signaturePngBase64 });
      } else {
        await signKpiAppraisalAsBlastingEngineer(appraisal.id, { signaturePngBase64 });
      }
      onSigned();
    } catch (err) {
      const message = extractErrorMessage(err);
      setLocalError(message);
      onError(message);
    } finally {
      setIsSigning(false);
    }
  }

  function handleSignClick() {
    if (hasSavedSignature) {
      void submit();
      return;
    }
    const drawn = signaturePadRef.current?.getSignature();
    if (!drawn) {
      setLocalError("Please sign to complete this sign-off.");
      return;
    }
    void submit(drawn);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 backdrop-blur-md">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Sign as {role}
      </p>
      {!hasSavedSignature && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <SignaturePad ref={signaturePadRef} height={110} />
        </div>
      )}
      {localError && <p className="mt-1 text-xs text-red-600">{localError}</p>}
      <button
        type="button"
        disabled={isSigning}
        onClick={handleSignClick}
        className="mt-2 rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
      >
        {isSigning ? "Signing..." : `Sign as ${role}`}
      </button>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { VerifyCredentialContent } from "@/components/verify-credential-content";
import { getMyCredentials } from "@/lib/api";
import { SpinnerGap } from "@phosphor-icons/react";

interface Props {
  params: Promise<{ merchantId: string }>;
}

export default function MerchantNfcRoute({ params }: Props) {
  const { merchantId } = use(params);
  const [resolvedCredentialId, setResolvedCredentialId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function resolve() {
      try {
        const res = await getMyCredentials(merchantId);
        const credId = res.activeCredential?.id || res.credentials?.[0]?.id || merchantId;
        if (isMounted) {
          setResolvedCredentialId(credId);
          setIsResolving(false);
        }
      } catch {
        if (isMounted) {
          setResolvedCredentialId(merchantId);
          setIsResolving(false);
        }
      }
    }

    resolve();

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  if (isResolving || !resolvedCredentialId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-[#E0262F] mb-3" />
        <p className="text-sm text-[var(--text-secondary)] font-mono">
          Resolving merchant credential...
        </p>
      </div>
    );
  }

  return <VerifyCredentialContent credentialId={resolvedCredentialId} />;
}

"use client";

import { use, useEffect, useMemo, useState } from "react";
import VerifyCredentialPage from "@/app/verify/[credentialId]/page";
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
        // Query credentials associated with the given merchantId
        const res = await getMyCredentials(merchantId);
        const credId = res.activeCredential?.id || res.credentials?.[0]?.id || merchantId;
        if (isMounted) {
          setResolvedCredentialId(credId);
          setIsResolving(false);
        }
      } catch {
        // If lookup fails, pass merchantId directly (backend verify route also supports fallback by merchant_id)
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

  // Memoize the promise so React 19's use() hook receives a stable reference across renders
  const stableParams = useMemo(() => {
    if (!resolvedCredentialId) return null;
    return Promise.resolve({ credentialId: resolvedCredentialId });
  }, [resolvedCredentialId]);

  if (isResolving || !stableParams) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-[#E0262F] mb-3" />
        <p className="text-sm text-[var(--text-secondary)] font-mono">
          Resolving merchant credential...
        </p>
      </div>
    );
  }

  return <VerifyCredentialPage params={stableParams} />;
}

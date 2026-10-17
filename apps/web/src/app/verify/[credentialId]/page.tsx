"use client";

import { use } from "react";
import { VerifyCredentialContent } from "@/components/verify-credential-content";

export default function VerifyCredentialPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = use(params);
  return <VerifyCredentialContent credentialId={credentialId} />;
}

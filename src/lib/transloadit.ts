import crypto from "crypto";

export function generateTransloaditParams(options?: {
  templateId?: string;
  maxFileSize?: number;
}) {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const authSecret = process.env.TRANSLOADIT_SECRET ?? "";

  const params = {
    auth: {
      key: authKey,
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "+00:00"),
    },
    ...(options?.templateId && { template_id: options.templateId }),
    steps: {
      ":original": {
        robot: "/upload/handle",
        result: true,
      },
    },
  };

  const paramsString = JSON.stringify(params);
  const signature = crypto
    .createHmac("sha384", authSecret)
    .update(paramsString)
    .digest("hex");

  return {
    params: paramsString,
    signature: `sha384:${signature}`,
  };
}

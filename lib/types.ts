export type ChainStatus = "OK" | "PARTIAL" | "FAILED";

export type CertificateDto = {
  index: number;
  role: "leaf" | "intermediate" | "root";
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  fingerprint256: string;
  subjectAltName?: string;
  ca: boolean;
  source: "server" | "aia" | "repository" | "crtsh" | "trust-store";
  pem: string;
};

export type ChainStep = {
  level: "info" | "ok" | "warning" | "error";
  message: string;
};

export type TLSChainResponse = {
  queryId: string;
  host: string;
  port: number;
  status: ChainStatus;
  verified: boolean;
  hostnameValid: boolean;
  summary: string;
  aiaUrls: string[];
  certificates: CertificateDto[];
  pemBundle: string;
  steps: ChainStep[];
};

export type DecodedCertificateResponse = {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  fingerprint256: string;
  fingerprint512?: string;
  key: {
    type?: string;
    bits?: number;
    curve?: string;
  };
  signatureAlgorithm?: string;
  certificateAuthority: boolean;
  subjectAltNames: string[];
  authorityInfoAccess: string[];
  crlDistributionPoints: string[];
  keyUsage: string[];
  extendedKeyUsage: string[];
};

export type DecodedCsrResponse = {
  subject: string;
  signatureAlgorithm?: string;
  signatureValid: boolean;
  key: {
    type?: string;
    bits?: number;
  };
  subjectAltNames: string[];
  requestedExtensions: string[];
  findings: Array<{
    level: "pass" | "warning" | "fail" | "info";
    title: string;
    detail: string;
  }>;
};

export type CertificateKeyMatchResponse = {
  matches: boolean;
  certificate: {
    subject: string;
    issuer: string;
    fingerprint256: string;
    keyType?: string;
    keyDetails?: string;
  };
  privateKey: {
    keyType?: string;
    keyDetails?: string;
  };
};

export type TlsProtocolName = "SSLv3" | "TLSv1" | "TLSv1.1" | "TLSv1.2" | "TLSv1.3";

export type TlsProtocolProbe = {
  name: TlsProtocolName;
  supported: boolean;
  cipher?: string;
  protocol?: string;
  error?: string;
};

export type Tls12CipherSuite = {
  name: string;
  opensslName: string;
  keyExchange: string;
  authentication: string;
  encryption: string;
  bits: number;
  forwardSecrecy: boolean;
  aead: boolean;
  weak: boolean;
  weakness?: string;
};

export type TlsProtocolDetails = {
  compression: {
    status: "not-supported" | "supported" | "unknown";
    detail?: string;
  };
  secureRenegotiation: {
    status: "secure" | "insecure" | "unknown" | "not-supported";
    detail?: string;
  };
  clientRenegotiation: {
    status: "rejected" | "supported" | "unknown" | "not-supported";
    detail?: string;
  };
  fallbackScsv: {
    status: "supported" | "not-supported" | "unknown";
    detail?: string;
  };
  sessionResumption: {
    status: "supported" | "not-supported" | "unknown";
    detail?: string;
  };
  keyExchange: {
    status: "modern" | "weak" | "unknown";
    type?: string;
    name?: string;
    size?: number;
    detail?: string;
  };
};

export type TlsScanFinding = {
  level: "pass" | "info" | "warning" | "fail";
  title: string;
  detail: string;
};

export type TlsGradeItem = {
  label: string;
  points: number;
  detail: string;
};

export type TlsRecommendation = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  impact: string;
  action: string;
  config?: Array<{
    label: string;
    value: string;
  }>;
};

export type TlsRedirectHop = {
  url: string;
  statusCode?: number;
  location?: string;
  hsts?: string;
};

export type TlsRedirectCheck = {
  testedUrl: string;
  finalUrl?: string;
  statusCode?: number;
  redirectsToHttps: boolean;
  redirectCount: number;
  hstsOnHttpsRedirect: boolean;
  hops: TlsRedirectHop[];
  error?: string;
  skipped?: boolean;
};

export type TlsScanCertificate = {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint256: string;
  serialNumber: string;
  subjectAltName?: string;
  keyType?: string;
  keyBits?: number;
  signatureAlgorithm?: string;
};

export type TlsEndpointProfile = {
  address: string;
  family: 4 | 6;
  status: "complete" | "error";
  error?: string;
  grade?: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "T" | "M";
  score?: number;
  trusted?: boolean;
  hostnameValid?: boolean;
  certificate?: Pick<TlsScanCertificate, "subject" | "issuer" | "validTo" | "fingerprint256">;
  cipher?: string;
  protocols?: Array<Pick<TlsProtocolProbe, "name" | "supported" | "cipher">>;
  differences: string[];
};

export type TlsClientCompatibilityProfile = {
  id: "modern" | "tls13" | "tls12-modern" | "tls12-legacy";
  supported: boolean;
  protocol?: string;
  cipher?: string;
  alpn?: string;
  error?: string;
};

export type TlsScanResponse = {
  queryId: string;
  host: string;
  port: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "T" | "M";
  score: number;
  gradeBreakdown: {
    baseScore: number;
    finalScore: number;
    items: TlsGradeItem[];
  };
  summary: string;
  assessedAt: string;
  ipAddresses: string[];
  endpointCoverage: {
    totalAddresses: number;
    scannedAddresses: number;
    truncated: boolean;
    consistent: boolean;
    hasErrors: boolean;
    endpoints: TlsEndpointProfile[];
  };
  clientCompatibility: TlsClientCompatibilityProfile[];
  certificate: TlsScanCertificate;
  chain: {
    verified: boolean;
    hostnameValid: boolean;
    certificatesProvided: number;
    generatedBundleCertificates: number;
    status: ChainStatus;
  };
  protocols: TlsProtocolProbe[];
  tls12Ciphers: {
    scanned: number;
    supported: Tls12CipherSuite[];
    serverOrder: "server" | "client" | "unknown";
    preferredCipher?: string;
  };
  protocolDetails: TlsProtocolDetails;
  hsts: {
    present: boolean;
    header?: string;
    maxAge?: number;
    includesSubDomains: boolean;
    preload: boolean;
  };
  hstsPreload: {
    checked: boolean;
    status: "preloaded" | "pending" | "pending-removal" | "removed" | "unknown" | "rejected" | "error";
    name?: string;
    domain?: string;
    preloadedDomain?: string;
    bulk?: boolean;
    error?: string;
  };
  ocspStapling: {
    requested: boolean;
    present: boolean;
    responseBytes?: number;
    error?: string;
  };
  ocspRevocation: {
    checked: boolean;
    status: "good" | "revoked" | "unknown" | "not-supported" | "error";
    responderUrl?: string;
    producedAt?: string;
    thisUpdate?: string;
    nextUpdate?: string;
    revocationTime?: string;
    error?: string;
  };
  http2: {
    supported: boolean;
    negotiatedProtocol?: string;
    alpnProtocols: string[];
  };
  caa: {
    present: boolean;
    records: string[];
  };
  redirects: {
    http: TlsRedirectCheck;
    https: TlsRedirectCheck;
    canonicalHost?: string;
  };
  alpn: string[];
  findings: TlsScanFinding[];
  recommendations: TlsRecommendation[];
};

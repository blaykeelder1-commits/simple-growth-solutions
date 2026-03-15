// SSL Certificate Expiration Monitoring
// Uses Node.js native https module to inspect TLS peer certificates

import https from "https";

export interface SSLExpirationResult {
  valid: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number;
  issuer: string | null;
}

/**
 * Check SSL certificate expiration for a given URL.
 * Makes an HTTPS request and inspects the TLS socket's peer certificate.
 */
export async function checkSSLExpiration(url: string): Promise<SSLExpirationResult> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);

      // Only works with HTTPS
      if (urlObj.protocol !== "https:") {
        resolve({
          valid: false,
          expiresAt: null,
          daysUntilExpiry: 0,
          issuer: null,
        });
        return;
      }

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: "/",
        method: "HEAD",
        rejectUnauthorized: false, // We want to inspect even expired certs
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        try {
          const socket = res.socket as import("tls").TLSSocket;
          if (!socket || !socket.getPeerCertificate) {
            resolve({
              valid: false,
              expiresAt: null,
              daysUntilExpiry: 0,
              issuer: null,
            });
            return;
          }

          const cert = socket.getPeerCertificate();
          if (!cert || !cert.valid_to) {
            resolve({
              valid: false,
              expiresAt: null,
              daysUntilExpiry: 0,
              issuer: null,
            });
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiry = Math.floor(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Extract issuer organization name
          const issuer = cert.issuer
            ? cert.issuer.O || cert.issuer.CN || null
            : null;

          // Certificate is valid if it hasn't expired and the connection was authorized
          const authorized = socket.authorized !== false;
          const valid = authorized && daysUntilExpiry > 0;

          resolve({
            valid,
            expiresAt,
            daysUntilExpiry,
            issuer,
          });
        } catch {
          resolve({
            valid: false,
            expiresAt: null,
            daysUntilExpiry: 0,
            issuer: null,
          });
        }

        // Consume the response to free up the socket
        res.resume();
      });

      req.on("error", () => {
        resolve({
          valid: false,
          expiresAt: null,
          daysUntilExpiry: 0,
          issuer: null,
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          valid: false,
          expiresAt: null,
          daysUntilExpiry: 0,
          issuer: null,
        });
      });

      req.end();
    } catch {
      resolve({
        valid: false,
        expiresAt: null,
        daysUntilExpiry: 0,
        issuer: null,
      });
    }
  });
}

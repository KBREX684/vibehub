import React from "react";
import { Buffer } from "buffer";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { AigcComplianceAuditTrailItem } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: "#111827" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  meta: { marginBottom: 4 },
  row: { marginTop: 8, paddingBottom: 6, borderBottom: "1 solid #e5e7eb" },
});

function AuditTrailDocument(props: {
  items: AigcComplianceAuditTrailItem[];
  exportedAt: string;
  month?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>VibeHub AIGC Compliance Audit Trail</Text>
        <Text style={styles.meta}>Exported At: {props.exportedAt}</Text>
        <Text style={styles.meta}>Month: {props.month ?? "all"}</Text>
        <Text style={styles.meta}>Entries: {props.items.length}</Text>

        {props.items.map((item) => (
          <View key={item.stampId} style={styles.row}>
            <Text>{item.workspaceTitle} · {item.filename}</Text>
            <Text>{item.provider} / {item.mode} / {item.visibleLabel}</Text>
            <Text>{item.stampedAt}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderAigcComplianceAuditTrailPdf(props: {
  items: AigcComplianceAuditTrailItem[];
  exportedAt?: string;
  month?: string;
}) {
  const instance = pdf(
    <AuditTrailDocument
      items={props.items}
      exportedAt={props.exportedAt ?? new Date().toISOString()}
      month={props.month}
    />
  );
  const stream = await instance.toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

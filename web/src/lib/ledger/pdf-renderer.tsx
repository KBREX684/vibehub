import React from "react";
import { Buffer } from "buffer";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { LedgerBundle } from "@/lib/repositories/ledger.repository";
import { computeLedgerBundleHash } from "@/lib/ledger/export-utils";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: "#111827" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  meta: { marginBottom: 4 },
  section: { marginTop: 14, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  row: { marginBottom: 6, paddingBottom: 6, borderBottom: "1 solid #e5e7eb" },
  mono: { fontFamily: "Courier", fontSize: 9 },
});

function LedgerBundleDocument(props: {
  bundle: LedgerBundle;
  workspaceId: string;
  exportedAt: string;
}) {
  const bundleHash = computeLedgerBundleHash(props.bundle);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>VibeHub Ledger Export</Text>
        <Text style={styles.meta}>Workspace: {props.workspaceId}</Text>
        <Text style={styles.meta}>Exported At: {props.exportedAt}</Text>
        <Text style={styles.meta}>Signed By: {props.bundle.signedBy}</Text>
        <Text style={styles.meta}>Entries: {props.bundle.entries.length}</Text>
        <Text style={styles.meta}>Bundle Hash: {bundleHash}</Text>
        <Text style={styles.meta}>Verify: vibehub-verify --bundle &lt;file&gt;</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entries</Text>
          {props.bundle.entries.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text>{entry.signedAt} · {entry.actionKind}</Text>
              <Text>Actor: {entry.actorType}:{entry.actorId}</Text>
              <Text>Target: {entry.targetType ?? "-"} / {entry.targetId ?? "-"}</Text>
              <Text style={styles.mono}>Payload Hash: {entry.payloadHash}</Text>
              <Text style={styles.mono}>Signature: {entry.signature}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderLedgerBundlePdf(props: {
  bundle: LedgerBundle;
  workspaceId: string;
  exportedAt?: string;
}) {
  const instance = pdf(
    <LedgerBundleDocument
      bundle={props.bundle}
      workspaceId={props.workspaceId}
      exportedAt={props.exportedAt ?? new Date().toISOString()}
    />
  );
  const stream = await instance.toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

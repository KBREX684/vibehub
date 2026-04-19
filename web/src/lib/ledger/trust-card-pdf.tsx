import React from "react";
import { Buffer } from "buffer";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { TrustCard } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: "#111827" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 12, marginBottom: 4 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  row: { marginBottom: 4 },
});

function TrustCardDocument(props: { card: TrustCard; exportedAt: string }) {
  const { card } = props;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{card.creatorName} Trust Card</Text>
        {card.headline ? <Text style={styles.subtitle}>{card.headline}</Text> : null}
        {card.summary ? <Text>{card.summary}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          {card.serviceScope ? <Text style={styles.row}>Service Scope: {card.serviceScope}</Text> : null}
          {card.city ? <Text style={styles.row}>City: {card.city}</Text> : null}
          {card.websiteUrl ? <Text style={styles.row}>Website: {card.websiteUrl}</Text> : null}
          {card.proofUrl ? <Text style={styles.row}>Proof: {card.proofUrl}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trust Metrics</Text>
          <Text style={styles.row}>Ledger Entries: {card.metrics.ledgerEntryCount}</Text>
          <Text style={styles.row}>Snapshots: {card.metrics.snapshotCount}</Text>
          <Text style={styles.row}>Stamped Artifacts: {card.metrics.stampedArtifactCount}</Text>
          <Text style={styles.row}>Public Works: {card.metrics.publicWorkCount}</Text>
          <Text style={styles.row}>Avg Response Hours: {card.metrics.avgResponseHours}</Text>
          <Text style={styles.row}>Registration Days: {card.metrics.registrationDays}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Projects</Text>
          {card.publicProjects.map((project) => (
            <Text key={project.id} style={styles.row}>
              {project.title} · {project.updatedAt}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text>Exported At: {props.exportedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderTrustCardPdf(props: {
  card: TrustCard;
  exportedAt?: string;
}) {
  const instance = pdf(
    <TrustCardDocument card={props.card} exportedAt={props.exportedAt ?? new Date().toISOString()} />
  );
  const stream = await instance.toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

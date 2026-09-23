import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  REPORT_BRAND,
  ReportData,
  formatCad,
  formatFactorList,
} from "@/lib/report/types";

const colors = {
  bg: "#07090b",
  surface: "#0d1115",
  soft: "#141a20",
  fg: "#f4f3ef",
  muted: "#a8adb3",
  subtle: "#6f767d",
  accent: "#b7ac7f",
  line: "#2a3036",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.bg,
    color: colors.fg,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 16,
  },
  brand: {
    fontSize: 16,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.fg,
  },
  tagline: {
    marginTop: 4,
    fontSize: 9,
    color: colors.muted,
  },
  docMeta: {
    fontSize: 8,
    color: colors.subtle,
    textAlign: "right",
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.accent,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.fg,
    marginBottom: 8,
  },
  range: {
    fontSize: 22,
    color: colors.fg,
    marginBottom: 4,
  },
  muted: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 1.45,
  },
  body: {
    color: colors.fg,
    fontSize: 10,
    lineHeight: 1.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  cell: {
    width: "50%",
    paddingRight: 12,
    paddingBottom: 8,
  },
  cellLabel: {
    fontSize: 8,
    color: colors.subtle,
    marginBottom: 2,
  },
  cellValue: {
    fontSize: 10,
    color: colors.fg,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletMark: {
    width: 10,
    color: colors.accent,
  },
  bulletText: {
    flex: 1,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 1.4,
  },
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginTop: 6,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7.5,
    color: colors.subtle,
    lineHeight: 1.4,
  },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value || "—"}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) {
    return <Text style={styles.muted}>None noted for this assessment.</Text>;
  }
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function EstateValoraReportDocument({ data }: { data: ReportData }) {
  const { valuation, property, homeowner, generatedAt } = data;
  const dateLabel = new Date(generatedAt).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const increasing = formatFactorList(valuation.factors_increasing_value);
  const decreasing = formatFactorList(valuation.factors_decreasing_value);

  return (
    <Document
      title={`${REPORT_BRAND.name} Valuation Report`}
      author={REPORT_BRAND.name}
      subject="Preliminary AI-assisted property valuation"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{REPORT_BRAND.name}</Text>
            <Text style={styles.tagline}>{REPORT_BRAND.tagline}</Text>
          </View>
          <View>
            <Text style={styles.docMeta}>Preliminary valuation report</Text>
            <Text style={styles.docMeta}>{dateLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Prepared for</Text>
          <Text style={styles.body}>{homeowner.name || "Homeowner"}</Text>
          {homeowner.email ? (
            <Text style={styles.muted}>{homeowner.email}</Text>
          ) : null}
          {homeowner.phone ? (
            <Text style={styles.muted}>{homeowner.phone}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Property overview</Text>
          <View style={styles.grid}>
            <Field label="Address" value={property.address || "—"} />
            <Field label="Property type" value={property.property_type || "—"} />
            <Field
              label="Bedrooms"
              value={
                property.bedrooms != null ? String(property.bedrooms) : "—"
              }
            />
            <Field
              label="Bathrooms"
              value={
                property.bathrooms != null ? String(property.bathrooms) : "—"
              }
            />
            <Field
              label="Living area"
              value={
                property.living_area_sqft != null
                  ? `${property.living_area_sqft.toLocaleString()} sq ft`
                  : "—"
              }
            />
            <Field label="Lot size" value={property.lot_size || "—"} />
            <Field
              label="Year built"
              value={
                property.year_built != null ? String(property.year_built) : "—"
              }
            />
            <Field label="Parking" value={property.parking_info || "—"} />
            <Field label="Basement" value={property.basement_info || "—"} />
            <Field label="Ownership" value={property.ownership || "—"} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Property characteristics</Text>
          <View style={styles.grid}>
            <Field label="Condition" value={property.condition || "—"} />
            <Field label="Renovations" value={property.renovations || "—"} />
            <Field
              label="Notable features"
              value={property.notable_features || "—"}
            />
            <Field
              label="Additional notes"
              value={property.additional_notes || "—"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Estimated market value</Text>
          <Text style={styles.range}>
            {formatCad(valuation.estimated_value_low)} –{" "}
            {formatCad(valuation.estimated_value_high)}
          </Text>
          <Text style={styles.muted}>
            Confidence: {valuation.confidence} · AI-assisted range, not a
            guaranteed selling price
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explanation</Text>
          <Text style={styles.body}>{valuation.explanation || "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Factors influencing the estimate</Text>
          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>
            Increasing value
          </Text>
          <BulletList items={increasing} />
          <Text style={[styles.sectionLabel, { marginTop: 10 }]}>
            Decreasing value
          </Text>
          <BulletList items={decreasing} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Property strengths</Text>
          <BulletList items={valuation.property_strengths || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Potential considerations</Text>
          <BulletList items={valuation.potential_considerations || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Market / property observations</Text>
          <BulletList items={valuation.market_observations || []} />
          <Text style={[styles.muted, { marginTop: 6 }]}>
            Phase 1 does not include MLS or comprehensive sold-comparable data.
            Observations reflect information available to the system only.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recommended next steps</Text>
          <BulletList items={[...REPORT_BRAND.nextSteps]} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Personal review & consultation</Text>
          <View style={styles.box}>
            <Text style={styles.body}>
              Would you like {REPORT_BRAND.brokerName} to personally review your
              valuation?
            </Text>
            <Text style={[styles.muted, { marginTop: 6 }]}>
              {REPORT_BRAND.brokerName} · {REPORT_BRAND.brokerTitle}
            </Text>
            <Text style={styles.muted}>{REPORT_BRAND.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Limitations & disclaimer</Text>
          <Text style={styles.muted}>
            {valuation.limitations
              ? `${valuation.limitations} `
              : ""}
            {REPORT_BRAND.disclaimer}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {REPORT_BRAND.name} · {REPORT_BRAND.tagline} · Preliminary
            AI-assisted estimate only · Subject to review by{" "}
            {REPORT_BRAND.brokerName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <EstateValoraReportDocument data={data} />
  );
  return Buffer.from(buffer);
}

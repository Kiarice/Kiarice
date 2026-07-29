/* ===================== Kia Rice — Firestore REST layer =====================
   Talks to Firestore via plain REST (no SDK) to avoid module loading issues
   on GitHub Pages. Project: kiarice — single doc at appdata/main holds
   the entire app state as one JSON blob (see DEFAULT_DATA in data.js).
============================================================================ */

const FIREBASE_PROJECT_ID = "kiarice";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const DOC_PATH = "appdata/main";

/* ---- JS value -> Firestore "fields" value ---- */
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val)
      ? { integerValue: String(val) }
      : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const k in val) fields[k] = toFirestoreValue(val[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/* ---- Firestore value -> JS value ---- */
function fromFirestoreValue(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) {
    const vals = v.arrayValue.values || [];
    return vals.map(fromFirestoreValue);
  }
  if ("mapValue" in v) {
    const fields = v.mapValue.fields || {};
    const out = {};
    for (const k in fields) out[k] = fromFirestoreValue(fields[k]);
    return out;
  }
  return null;
}

function jsToFirestoreDoc(obj) {
  const fields = {};
  for (const k in obj) fields[k] = toFirestoreValue(obj[k]);
  return { fields };
}

function firestoreDocToJs(doc) {
  if (!doc || !doc.fields) return {};
  const out = {};
  for (const k in doc.fields) out[k] = fromFirestoreValue(doc.fields[k]);
  return out;
}

/* ---- Public API ---- */
const KiaDB = {
  async load() {
    const res = await fetch(`${FIRESTORE_BASE}/${DOC_PATH}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("خطا در دریافت اطلاعات از سرور");
    const doc = await res.json();
    return firestoreDocToJs(doc);
  },

  async save(data) {
    const body = JSON.stringify(jsToFirestoreDoc(data));
    const res = await fetch(`${FIRESTORE_BASE}/${DOC_PATH}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error("خطا در ذخیره اطلاعات");
    return true;
  },
};

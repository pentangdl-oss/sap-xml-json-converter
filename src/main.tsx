import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Check, Clipboard, Download, FileJson, Play, RotateCcw, Settings2, Trash2, XCircle } from "lucide-react";
import "./styles.css";

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>

<ns0:Customers xmlns:ns0="http://AGCO/CORE/SMK/SMK3000">
  <Customer>
    <USERCODE/>

    <KNA1>
      <KUNNR>3601273316</KUNNR>
      <ANRED/>
      <LAND1>FI</LAND1>
      <NAME1>Paananen Tuomas</NAME1>
      <NAME2/>
      <ORT01>KÄLVIÄ</ORT01>
      <PSTLZ>68300</PSTLZ>
      <SORTL/>
      <STRAS>Peltokorventie 340</STRAS>
      <TELF1>0442698384</TELF1>
      <TELF2/>
      <TELFX/>
      <STCEG/>
      <SPRAS>FI</SPRAS>
    </KNA1>

    <KNVV>
      <WAERS>EUR</WAERS>
      <ZTERM>6</ZTERM>
    </KNVV>

    <KNB1>
      <BUKRS>0360</BUKRS>
      <ZTERM>6</ZTERM>
      <ZSABE>120384-065X</ZSABE>
      <ALTKN>1273316</ALTKN>
      <VZSKZ>14</VZSKZ>
    </KNB1>
  </Customer>
</ns0:Customers>`;

type ConverterOptions = {
  removeNamespaces: boolean;
  includeAttributes: boolean;
  emptyTagsToNull: boolean;
  forceArrays: boolean;
  trimText: boolean;
};

const defaultOptions: ConverterOptions = {
  removeNamespaces: true,
  includeAttributes: false,
  emptyTagsToNull: false,
  forceArrays: false,
  trimText: true,
};

function removeNamespacePrefix(name: string) {
  const colonIndex = name.indexOf(":");
  return colonIndex >= 0 ? name.slice(colonIndex + 1) : name;
}

function normalizeParsedValue(value: unknown, options: ConverterOptions): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeParsedValue(item, options));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, nested]) => {
      if (!options.includeAttributes && key.startsWith("@_")) {
        return acc;
      }

      const normalizedKey = options.removeNamespaces
        ? key.startsWith("@_")
          ? `@_${removeNamespacePrefix(key.slice(2))}`
          : removeNamespacePrefix(key)
        : key;

      acc[normalizedKey] = normalizeParsedValue(nested, options);
      return acc;
    }, {});
  }

  if (value === "" && options.emptyTagsToNull) {
    return null;
  }

  if (typeof value === "string" && options.trimText) {
    const trimmed = value.trim();
    return trimmed === "" && options.emptyTagsToNull ? null : trimmed;
  }

  return value;
}

function convertXmlToJson(xml: string, options: ConverterOptions) {
  const xmlToParse = xml.replace(/^\uFEFF/, "");
  const validationResult = XMLValidator.validate(xmlToParse, {
    allowBooleanAttributes: true,
  });

  if (validationResult !== true) {
    const error = validationResult.err;
    const location = error.line || error.col ? `Line ${error.line}, column ${error.col}: ` : "";
    throw new Error(`${location}${error.msg}`);
  }

  const parserOptions = {
    ignoreAttributes: !options.includeAttributes,
    attributeNamePrefix: "@_",
    trimValues: options.trimText,
    parseTagValue: false,
    parseAttributeValue: false,
    allowBooleanAttributes: true,
    ...(options.forceArrays ? { isArray: () => true } : {}),
  };

  const parser = new XMLParser(parserOptions);

  return normalizeParsedValue(parser.parse(xmlToParse), options);
}

function createConversion(xml: string, options: ConverterOptions) {
  if (!xml.trim()) {
    return {
      error: "Paste an SAP XML message, then click Convert.",
      output: "",
    };
  }

  try {
    const json = convertXmlToJson(xml, options);
    return {
      error: "",
      output: JSON.stringify(json, null, 2),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to parse XML.",
      output: "",
    };
  }
}

function OptionToggle({
  checked,
  label,
  helper,
  onChange,
}: {
  checked: boolean;
  label: string;
  helper: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="option">
      <span>
        <strong>{label}</strong>
        <small>{helper}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function App() {
  const [xmlInput, setXmlInput] = useState(sampleXml);
  const [options, setOptions] = useState<ConverterOptions>(defaultOptions);
  const [conversion, setConversion] = useState(() => createConversion(sampleXml, defaultOptions));
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const updateOption = (key: keyof ConverterOptions, value: boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  const convertCurrentXml = () => {
    setConversion(createConversion(xmlInput, options));
  };

  const resetSample = () => {
    setXmlInput(sampleXml);
    setConversion(createConversion(sampleXml, options));
  };

  const clearXml = () => {
    setXmlInput("");
    setConversion({
      error: "",
      output: "",
    });
  };

  const copyJson = async () => {
    if (!conversion.output) return;
    await navigator.clipboard.writeText(conversion.output);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  };

  const downloadJson = () => {
    if (!conversion.output) return;
    const blob = new Blob([conversion.output], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sap-message.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SAP message utility</p>
          <h1>SAP XML to JSON Converter</h1>
        </div>
        <div className="actions">
          <button type="button" onClick={convertCurrentXml}>
            <Play size={18} aria-hidden="true" />
            Convert
          </button>
          <button type="button" className="secondary" onClick={clearXml}>
            <Trash2 size={18} aria-hidden="true" />
            Clear XML
          </button>
          <button type="button" className="secondary" onClick={resetSample}>
            <RotateCcw size={18} aria-hidden="true" />
            Reset sample
          </button>
          <button type="button" className="secondary" onClick={copyJson} disabled={!conversion.output}>
            {copyState === "copied" ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
            {copyState === "copied" ? "Copied" : "Copy JSON"}
          </button>
          <button type="button" onClick={downloadJson} disabled={!conversion.output}>
            <Download size={18} aria-hidden="true" />
            Download JSON
          </button>
        </div>
      </header>

      <section className="options-bar" aria-label="Conversion options">
        <div className="options-title">
          <Settings2 size={20} aria-hidden="true" />
          Options
        </div>
        <OptionToggle
          checked={options.removeNamespaces}
          label="Remove namespace prefixes"
          helper="ns0:Customers becomes Customers"
          onChange={(checked) => updateOption("removeNamespaces", checked)}
        />
        <OptionToggle
          checked={options.includeAttributes}
          label="Include attributes"
          helper="Keep XML attributes as @_ keys"
          onChange={(checked) => updateOption("includeAttributes", checked)}
        />
        <OptionToggle
          checked={options.emptyTagsToNull}
          label="Empty tags to null"
          helper="<FIELD/> becomes null"
          onChange={(checked) => updateOption("emptyTagsToNull", checked)}
        />
        <OptionToggle
          checked={options.forceArrays}
          label="Force arrays"
          helper="Wrap parsed nodes in []"
          onChange={(checked) => updateOption("forceArrays", checked)}
        />
        <OptionToggle
          checked={options.trimText}
          label="Trim text values"
          helper="Clean whitespace around values"
          onChange={(checked) => updateOption("trimText", checked)}
        />
      </section>

      <section className="workspace">
        <article className="panel">
          <div className="panel-header">
            <h2>SAP XML input</h2>
            <span>{xmlInput.length.toLocaleString()} chars</span>
          </div>
          <textarea
            aria-label="SAP XML input"
            value={xmlInput}
            onChange={(event) => setXmlInput(event.target.value)}
            spellCheck={false}
          />
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>JSON output</h2>
            <span>{conversion.error ? "Parse blocked" : conversion.output ? "Converted JSON" : "Waiting to convert"}</span>
          </div>
          {conversion.error ? (
            <div className="error-box" role="alert">
              <XCircle size={22} aria-hidden="true" />
              <div>
                <strong>XML parsing error</strong>
                <p>{conversion.error}</p>
              </div>
            </div>
          ) : !conversion.output ? (
            <div className="empty-box">
              <FileJson size={24} aria-hidden="true" />
              <strong>Paste XML on the left, then click Convert.</strong>
            </div>
          ) : (
            <pre aria-label="Formatted JSON output">
              <code>{conversion.output}</code>
            </pre>
          )}
        </article>
      </section>

      <footer>
        <FileJson size={18} aria-hidden="true" />
        Browser-only conversion powered by fast-xml-parser.
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Turns chat messages into a readable PDF. Deep Research and Coder each grew
// their own jsPDF routine tuned to their output (linked sources, one page per
// file); this one is for ordinary conversation prose and is shared by every
// download in the chat -- a single reply or a whole thread.
//
// jsPDF is imported dynamically so the ~350KB library only loads when someone
// actually asks for a PDF.

export type PdfEntry = {
  role: "user" | "assistant";
  content: string;
  sources?: { title?: string; url: string }[];
};

const MARGIN_X = 48;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const LINE = 14;

const INK = [24, 28, 40] as const;
const MUTED = [120, 128, 150] as const;
const LINK = [59, 92, 230] as const;

// Strips the markdown that doesn't survive into a flat PDF, keeping link URLs
// because a printed page can't be clicked through to find them.
function inline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^\s*>\s?/, "");
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "chat";
}

export async function downloadChatPdf(
  entries: PdfEntry[],
  opts?: { filename?: string; heading?: string }
): Promise<void> {
  const usable = entries.filter((e) => e.content?.trim());
  if (usable.length === 0) return;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - MARGIN_X * 2;
  let y = MARGIN_TOP;

  const room = (needed = LINE) => {
    if (y + needed > pageHeight - MARGIN_BOTTOM) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  const write = (
    text: string,
    opt: { size?: number; font?: string; style?: string; indent?: number; color?: readonly number[] } = {}
  ) => {
    const { size = 10.5, font = "helvetica", style = "normal", indent = 0, color = INK } = opt;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text || " ", maxWidth - indent) as string[];
    const step = size <= 9 ? LINE - 3 : LINE;
    for (const line of lines) {
      room(step);
      doc.text(line, MARGIN_X + indent, y);
      y += step;
    }
  };

  // Masthead
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(opts?.heading || "Yoojel", MARGIN_X, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(
    new Date().toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" }),
    MARGIN_X,
    y
  );
  y += 12;
  doc.setDrawColor(215, 219, 230);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
  y += 22;

  usable.forEach((entry, i) => {
    if (i > 0) y += 10;
    room(LINE * 2);

    write(entry.role === "user" ? "YOU" : "YOOJEL", {
      size: 8.5,
      style: "bold",
      color: MUTED,
    });
    y += 2;

    let inCode = false;
    for (const raw of entry.content.split("\n")) {
      const line = raw.replace(/\s+$/, "");

      if (/^\s*```/.test(line)) {
        inCode = !inCode;
        y += 4;
        continue;
      }
      if (inCode) {
        write(line || " ", { font: "courier", size: 8.5, indent: 12, color: MUTED });
        continue;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        y += LINE * 0.45;
        continue;
      }
      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        room(LINE);
        doc.setDrawColor(224, 228, 238);
        doc.line(MARGIN_X, y - 4, pageWidth - MARGIN_X, y - 4);
        y += LINE * 0.6;
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
      const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
      const ordered = trimmed.match(/^(\d{1,3})[.)]\s+(.*)$/);

      if (heading) {
        y += 6;
        write(inline(heading[2]), { size: heading[1].length <= 2 ? 13 : 11.5, style: "bold" });
        y += 2;
      } else if (bullet) {
        room();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text("•", MARGIN_X + 4, y);
        write(inline(bullet[1]), { indent: 18 });
      } else if (ordered) {
        room();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(`${ordered[1]}.`, MARGIN_X + 2, y);
        write(inline(ordered[2]), { indent: 22 });
      } else {
        write(inline(trimmed));
      }
    }

    if (entry.sources?.length) {
      y += 8;
      write("Sources", { size: 9.5, style: "bold", color: MUTED });
      entry.sources.forEach((s, n) => {
        room();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(LINK[0], LINK[1], LINK[2]);
        const label = `[${n + 1}] ${s.title || s.url}`;
        const lines = doc.splitTextToSize(label, maxWidth) as string[];
        doc.textWithLink(lines[0], MARGIN_X, y, { url: s.url });
        y += LINE - 3;
        for (const extra of lines.slice(1)) {
          room(LINE - 3);
          doc.text(extra, MARGIN_X, y);
          y += LINE - 3;
        }
      });
      doc.setTextColor(INK[0], INK[1], INK[2]);
    }
  });

  // Page numbers, added last so the total is known.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("yoojel.com", MARGIN_X, pageHeight - 28);
    doc.text(`${p} / ${pages}`, pageWidth - MARGIN_X, pageHeight - 28, { align: "right" });
  }

  doc.save(`${sanitizeFilename(opts?.filename || "yoojel-chat")}.pdf`);
}

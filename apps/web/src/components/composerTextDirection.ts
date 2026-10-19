import { Extension } from "@tiptap/core";
import { type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { blockDirection } from "../lib/textDirection";

// Code reads left to right in any language; chips are atoms with no text, so they never count.
function textblockProse(node: ProseMirrorNode): string {
  let text = "";
  node.descendants((child) => {
    if (child.isText && !child.marks.some((mark) => mark.type.name === "code")) {
      text += child.text ?? "";
    }
    return true;
  });
  return text;
}

function blockDirectionOf(node: ProseMirrorNode): "ltr" | "rtl" | "auto" {
  if (node.type.spec.code) return "ltr";
  if (node.isTextblock) return blockDirection(textblockProse(node));
  // A list item takes its first line's direction, which places its bullet or checkbox.
  const first = node.firstChild;
  return first?.isTextblock ? blockDirectionOf(first) : "auto";
}

/**
 * `dir` on every line and list item by its dominant script. `dir="auto"` goes by the first
 * letter, so a Hebrew or Arabic line that opens with an English word would lay out left to right.
 */
function directionDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock || node.type.name === "listItem" || node.type.name === "taskItem") {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: blockDirectionOf(node) }));
    }
    return !node.isTextblock;
  });
  return DecorationSet.create(doc, decorations);
}

const ComposerDirectionPlugin = new Plugin<DecorationSet>({
  key: new PluginKey("composer-text-direction"),
  state: {
    init: (_config, state) => directionDecorations(state.doc),
    apply: (transaction, decorations) =>
      transaction.docChanged ? directionDecorations(transaction.doc) : decorations,
  },
  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});

export const ComposerDirectionExtension = Extension.create({
  name: "composer-text-direction",
  addProseMirrorPlugins() {
    return [ComposerDirectionPlugin];
  },
});

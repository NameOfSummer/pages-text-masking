import {
  defaultKeymap,
  history,
  historyKeymap,
  isolateHistory,
} from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { foldGutter, foldKeymap } from "@codemirror/language";
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  lineNumbers,
  WidgetType,
} from "@codemirror/view";
import { useEffect, useRef } from "react";
import { buildReplacedRange, type Segment } from "@/lib/replace";

/** 一致箇所の印を差し替える */
const setDecorations = StateEffect.define<DecorationSet>();

/** 一致箇所の印（OFF: 黄色のマーカー、ON: 置換後の文字） */
const decorationField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(setDecorations)) return effect.value;
    }
    // 親が新しい区間を渡すまでの間、入力に合わせて位置をずらす
    return decorations.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** 一致箇所に重ねて置換後の文字を出す部品 */
class ReplacementWidget extends WidgetType {
  /**
   * 置換後を受け取る。
   * @param replacement 置換後
   */
  constructor(readonly replacement: string) {
    super();
  }

  /**
   * 同じ部品かを比べる。
   * @param other 比べる部品
   * @returns {boolean} 同じ置換後なら true（DOM を作り直さない）
   */
  override eq(other: ReplacementWidget): boolean {
    return other.replacement === this.replacement;
  }

  /**
   * 表示する要素を作る。
   * @returns {HTMLElement} 置換後の文字を入れた要素
   */
  toDOM(): HTMLElement {
    const mark = document.createElement("mark");
    mark.className = "cm-replaced";
    mark.textContent = this.replacement;
    return mark;
  }
}

/** 置換 OFF の黄色のマーカー */
const MARKER = Decoration.mark({ class: "cm-marker" });

/**
 * 区間から一致箇所の印を作る。
 * @param segments 原文をルールで分割した区間
 * @param isReplacing 置換中なら true
 * @returns {DecorationSet} 一致箇所の印
 */
function buildDecorations(
  segments: readonly Segment[],
  isReplacing: boolean,
): DecorationSet {
  return Decoration.set(
    segments.flatMap((segment) => {
      if (!segment.rule) return [];
      const decoration = isReplacing
        ? Decoration.replace({
            widget: new ReplacementWidget(segment.rule.replacement),
          })
        : MARKER;
      return [
        decoration.range(segment.start, segment.start + segment.text.length),
      ];
    }),
  );
}

/**
 * 置換中かどうかで変わる設定（読み取り専用と読み上げの名前）。
 * @param isReplacing 置換中なら true
 * @returns {import("@codemirror/state").Extension} 設定
 */
function replacingExtension(isReplacing: boolean) {
  return [
    EditorState.readOnly.of(isReplacing),
    EditorView.contentAttributes.of(
      isReplacing
        ? { "aria-label": "置換後のテキスト", "aria-readonly": "true" }
        : { "aria-label": "テキスト" },
    ),
  ];
}

/**
 * JSON のときだけ折りたたみを付ける。
 * @param isJson JSON なら true
 * @returns {import("@codemirror/state").Extension} 設定
 */
function jsonExtension(isJson: boolean) {
  // 外すと折りたたみの状態も消えるので、JSON でなくなったら全部展開される
  return isJson ? [json(), foldGutter()] : [];
}

/** 見た目（base theme より強くするため EditorView.theme で書く） */
const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent" },
  // フォーカスは外枠の inset の影（focus-within）で示す
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "inherit",
    overflowY: "scroll",
  },
  ".cm-content": { padding: "18px 20px 18px 8px", caretColor: "var(--ink)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--faint)",
    paddingLeft: "12px",
  },
  ".cm-foldGutter .cm-gutterElement": {
    color: "var(--sub)",
    cursor: "pointer",
  },
  ".cm-marker": { backgroundColor: "var(--marker)", borderRadius: "3px" },
  ".cm-replaced": {
    backgroundColor: "var(--marker-replaced)",
    borderRadius: "3px",
    color: "inherit",
  },
});

/** テキストエディタの props */
type Props = {
  /** 原文 */
  text: string;
  /** 原文をルールで分割した区間 */
  segments: readonly Segment[];
  /** 置換中なら true（置換後を読み取り専用で出す） */
  isReplacing: boolean;
  /** 原文が JSON なら true（折りたためるようにする） */
  isJson: boolean;
  /** 原文を書き換えたときに呼ぶ関数 */
  onTextChange: (text: string) => void;
};

/**
 * テキストエディタ（CodeMirror）。行番号を出し、置換 OFF では一致箇所に黄色いマーカー、置換 ON では読み取り専用にして一致箇所を置換後に差し替える。
 * @param props テキストエディタの props
 * @returns {JSX.Element} テキストエディタ
 */
export function TextEditor({
  text,
  segments,
  isReplacing,
  isJson,
  onTextChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);
  const replacingCompartment = useRef(new Compartment()).current;
  const jsonCompartment = useRef(new Compartment()).current;
  const onTextChangeRef = useRef(onTextChange);
  const segmentsRef = useRef(segments);

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
    segmentsRef.current = segments;
  });

  // CodeMirror（外部）を 1 つだけ作る。props は下の effect で反映する
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        extensions: [
          lineNumbers(),
          EditorView.lineWrapping,
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
          decorationField,
          replacingCompartment.of(replacingExtension(false)),
          jsonCompartment.of(jsonExtension(false)),
          EditorView.contentAttributes.of({ spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onTextChangeRef.current(update.state.doc.toString());
            }
          }),
          // 置換中は原文ではなく置換後をコピーする（伏せた語がクリップボードに出ないようにする）
          EditorView.domEventHandlers({
            copy: (event, editorView) => {
              if (!editorView.state.readOnly || !event.clipboardData) {
                return false;
              }
              const value = editorView.state.selection.ranges
                .filter((range) => !range.empty)
                .map((range) =>
                  buildReplacedRange(segmentsRef.current, range.from, range.to),
                )
                .join("\n");
              event.clipboardData.setData("text/plain", value);
              event.preventDefault();
              return true;
            },
          }),
          theme,
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [replacingCompartment, jsonCompartment]);

  // 外から本文が変わったとき（整形など）だけ差し替える。履歴に積まれるので Undo で戻せる
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === text) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      // 直前の入力とまとめず、Undo 1 回で差し替え前に戻れるようにする
      annotations: isolateHistory.of("full"),
    });
  }, [text]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: [
        replacingCompartment.reconfigure(replacingExtension(isReplacing)),
        jsonCompartment.reconfigure(jsonExtension(isJson)),
        setDecorations.of(buildDecorations(segments, isReplacing)),
      ],
    });
  }, [segments, isReplacing, isJson, replacingCompartment, jsonCompartment]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] bg-bg font-editor text-editor tracking-normal text-ink shadow-inset focus-within:shadow-inset-focus"
    />
  );
}

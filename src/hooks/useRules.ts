import { useCallback, useEffect, useRef, useState } from "react";
import { type Rule } from "@/lib/rules";
import { loadRules, saveRules } from "@/lib/storage";

/** useRules の戻り値 */
type RulesState = {
  /** ルール一覧（並び順どおり） */
  rules: Rule[];
  /** ルール一覧を置き換える */
  setRules: (rules: Rule[]) => void;
  /** 新しいルールに付ける ID を発行する */
  createRuleId: () => number;
};

/**
 * 置換ルールを localStorage から読み込み、変更のたびに保存する。
 * @param storage 使える localStorage（使えなければ null で、保存せずに動く）
 * @param reportSaveResult 保存の結果を知らせる関数
 * @returns {RulesState} ルール一覧と更新用の関数
 */
export function useRules(
  storage: Storage | null,
  reportSaveResult: (isSaved: boolean) => void,
): RulesState {
  const [rules, setRules] = useState<Rule[]>(() =>
    loadRules(storage).map((rule, index) => ({ ...rule, id: index + 1 })),
  );
  // 読み込んだルールの次の番号から振る
  const nextIdRef = useRef(rules.length + 1);

  const createRuleId = useCallback(() => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  }, []);

  // ルールを localStorage と同期する
  useEffect(() => {
    if (!storage) return;
    reportSaveResult(saveRules(storage, rules));
  }, [storage, rules, reportSaveResult]);

  return { rules, setRules, createRuleId };
}

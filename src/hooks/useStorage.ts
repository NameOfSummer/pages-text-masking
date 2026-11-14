import { useCallback, useState } from "react";
import { getStorage } from "@/lib/storage";

/** useStorage の戻り値 */
type StorageState = {
  /** 使える localStorage（使えなければ null） */
  storage: Storage | null;
  /** 保存できる状態か（使えない・書き込みに失敗したら false） */
  isAvailable: boolean;
  /** 保存の結果を知らせる（失敗したら isAvailable を false にする） */
  reportSaveResult: (isSaved: boolean) => void;
};

/**
 * localStorage を一度だけ取得し、保存できる状態かを管理する。
 * @returns {StorageState} Storage と、保存できる状態か
 */
export function useStorage(): StorageState {
  const [storage] = useState<Storage | null>(getStorage);
  const [hasSaveFailed, setHasSaveFailed] = useState(false);
  const reportSaveResult = useCallback((isSaved: boolean) => {
    if (!isSaved) setHasSaveFailed(true);
  }, []);
  return {
    storage,
    isAvailable: storage !== null && !hasSaveFailed,
    reportSaveResult,
  };
}

/**
 * <Grabbable> のルート group に付与する userData キー。値は grabbable ID。
 * GrabSystem のレイキャストがヒットしたメッシュから親を辿って掴める対象と判別する。
 * プラットフォーム側（xrift-frontend）の GrabSystem と共有する契約のため変更しないこと。
 */
export const GRABBABLE_USER_DATA_KEY = '__xriftGrabbableId'

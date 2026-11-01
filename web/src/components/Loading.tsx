// Placeholders in the shape of what is loading (Fluent Skeleton, part of @fluentui/react-components):
// the page keeps its layout while the evidence or the contract file loads, instead of a spinner in
// an empty box that makes the column collapse and jump on every switch.
import { Skeleton, SkeletonItem } from "@fluentui/react-components";

/** The original page as a sheet of paper on the desk (A4: 1 : 1.414), the findings beside it - the
 *  columns of the contract file (app.css .cf-grid), so nothing jumps when it has loaded. */
export function EvidenceSkeleton({ label }: { label: string }) {
  return (
    <div className="evidence loading" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <Skeleton aria-hidden className="sk">
        <div className="cf-grid">
          <div className="panel ev-source">
            <SkeletonItem size={16} className="sk-w30" />
            <div className="page-scroll sk-desk"><div className="sk-page" /></div>
          </div>
          <div className="panel sk-side">
            <SkeletonItem size={16} className="sk-w50" />
            <SkeletonItem size={40} />
            <SkeletonItem size={40} />
            <SkeletonItem size={12} className="sk-w90" />
            <SkeletonItem size={12} className="sk-w70" />
          </div>
        </div>
      </Skeleton>
    </div>
  );
}

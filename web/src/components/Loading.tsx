// Placeholders in the shape of what is loading (Fluent Skeleton, part of @fluentui/react-components):
// the page keeps its layout while the evidence or the contract file loads, instead of a spinner in
// an empty box that makes the column collapse and jump on every switch.
import { Skeleton, SkeletonItem } from "@fluentui/react-components";

/** The original page as a sheet of paper on the desk (A4: 1 : 1.414), the verdict beside it. */
export function EvidenceSkeleton({ label, withHead = true }: { label: string; withHead?: boolean }) {
  return (
    <div className="evidence loading" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <Skeleton aria-hidden className="sk">
        {withHead && (
          <div className="panel ev-head sk-head">
            <SkeletonItem shape="rectangle" className="sk-id" />
            <div className="sk-lines">
              <SkeletonItem size={24} className="sk-w50" />
              <SkeletonItem size={12} className="sk-w70" />
            </div>
          </div>
        )}
        <div className="ev-grid">
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

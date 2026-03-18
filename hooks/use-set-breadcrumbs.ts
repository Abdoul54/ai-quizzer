"use client";

import { useEffect } from "react";
import { useBreadcrumbs, type BreadcrumbItem } from "@/providers/breadcrumb-provider";

export function useSetBreadcrumbs(items: BreadcrumbItem[]) {
  const { setBreadcrumbs } = useBreadcrumbs();
  const serialized = JSON.stringify(items);

  useEffect(() => {
    setBreadcrumbs(JSON.parse(serialized));
    return () => setBreadcrumbs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}
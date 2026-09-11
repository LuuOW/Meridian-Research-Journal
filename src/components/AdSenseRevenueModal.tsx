import React from "react";
import { BlogPost } from "../types";

export interface AdSenseRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogs?: BlogPost[];
  activeBlog?: BlogPost;
}

export function AdSenseRevenueModal(_props: AdSenseRevenueModalProps): React.ReactElement | null {
  return null;
}

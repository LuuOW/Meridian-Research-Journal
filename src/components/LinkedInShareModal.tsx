import React from "react";
import { XShareModal, XShareModalProps } from "./XShareModal";

export type LinkedInShareModalProps = XShareModalProps;

export const LinkedInShareModal: React.FC<LinkedInShareModalProps> = (props) => {
  return <XShareModal {...props} />;
};

export default LinkedInShareModal;

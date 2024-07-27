import { ReactNode } from "react";

import { Dialog, DialogTitle } from "@headlessui/react";

import Button from "./Button";

interface ILabelDialogProps {
  title: string;
  show: boolean;
  cancelText: string;
  handleCancel: () => void;
  button: ReactNode;
  children: ReactNode;
}

const LabelDialog = (props: ILabelDialogProps) => (
  <Dialog
    className="fixed z-50 inset-0 overflow-y-auto"
    open={props.show}
    onClose={props.handleCancel}
  >
    <div className="flex items-center justify-center min-h-screen">
      <div className="fixed inset-0 bg-black opacity-30" />

      <span className="inline-block h-screen align-middle" aria-hidden="true">
        &#8203;
      </span>
      <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden bg-white transition-all transform shadow-xl rounded-lg">
        <div className="flex">
          <div className="ml-4 flex-auto">
            <DialogTitle className="text-gray-800 text-xl leading-6 font-medium">
              {props.title}
            </DialogTitle>

            {props.children}

            <div className="mt-4 flex justify-end space-x-2">
              {props.button}
              <button type="button" onClick={props.handleCancel}>
                <Button sm secondary>
                  {props.cancelText}
                </Button>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
);

export { LabelDialog };

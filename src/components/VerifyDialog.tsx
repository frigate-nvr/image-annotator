import { ReactNode } from "react";

import { Dialog, DialogTitle } from "@headlessui/react";

import { Button } from "./Button";

interface IVerifyDialogProps {
  title: string;
  description: string;
  show: boolean;
  cancelText: string;
  handleCancel: () => void;
  button: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
}

const VerifyDialog = (props: IVerifyDialogProps) => (
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
      <div
        className={`inline-block w-full ${
          props.maxWidthClass ?? "max-w-md"
        } p-6 my-8 overflow-hidden bg-white transition-all transform shadow-xl rounded-lg`}
      >
        <div className="flex w-full">
          <div className="ml-4 w-full">
            <DialogTitle className="text-gray-800 text-xl leading-6 font-medium">
              {props.title}
            </DialogTitle>

            <div className="mt-2 text-sm text-gray-600">
              {props.description}
            </div>

            {props.children}

            <div className="mt-4 flex justify-end space-x-2">
              <button type="button" onClick={props.handleCancel}>
                <Button sm secondary>
                  {props.cancelText}
                </Button>
              </button>

              {props.button}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
);

export { VerifyDialog };

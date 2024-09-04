import { ReactNode } from "react";

import { Dialog, DialogTitle } from "@headlessui/react";

import { Button } from "./Button";

interface IInfoDialogProps {
  title: string;
  description?: string;
  show: boolean;
  handleClose: () => void;
  children: ReactNode;
}

const InfoDialog = (props: IInfoDialogProps) => (
  <Dialog
    className="fixed z-50 inset-0 overflow-y-auto"
    open={props.show}
    onClose={props.handleClose}
  >
    <div className="flex items-center justify-center min-h-screen">
      <div className="fixed inset-0 bg-black opacity-30" />

      <span className="inline-block h-screen align-middle" aria-hidden="true">
        &#8203;
      </span>
      <div className="inline-block w-full max-w-3xl p-6 my-8 overflow-hidden bg-white transition-all transform shadow-xl rounded-lg">
        <div className="flex">
          <div className="mx-4 flex-auto">
            <DialogTitle className="text-gray-800 text-xl leading-6 font-medium">
              {props.title}
            </DialogTitle>

            <div className="mt-2 text-sm text-gray-600">
              {props.description}
            </div>

            {props.children}

            <div className="mt-4 flex justify-end space-x-2">
              <button type="button" onClick={props.handleClose}>
                <Button sm>Close</Button>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
);

export { InfoDialog };

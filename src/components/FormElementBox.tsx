import "./FormElementBox.module.css";
import { ReactNode } from "react";

import classNames from "classnames";

interface IFormElementBoxProps {
  htmlFor?: string;
  text: string;
  children: ReactNode;
  colSpanSize?: string;
}

/**
 * @component
 * @params props - Component props.
 * @param props.htmlFor - for attribute in HTML.
 * @param props.text - Label text.
 * @param props.children - Children components.
 * @param props.colSpanSize - Tailwind CSS class to control how elements are sized in grid.
 */
const FormElementBox = (props: IFormElementBoxProps) => {
  const boxClass = classNames(
    "form-element-box",
    "flex",
    "items-center",
    props.colSpanSize
  );

  return (
    <div className={boxClass}>
      {props.children}

      <label htmlFor={props.htmlFor} className="ml-2">
        {props.text}
      </label>
    </div>
  );
};

export { FormElementBox };

import type { JSX } from "solid-js";

type CardProps = {
  title?: string;
  children: JSX.Element;
  actions?: JSX.Element;
};

export default function Card(props: CardProps) {
  return (
    <div class="rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-sm transition-shadow hover:shadow-md">
      {props.title || props.actions ? (
        <div class="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
          <div class="text-sm font-semibold text-black dark:text-white">{props.title}</div>
          <div>{props.actions}</div>
        </div>
      ) : null}
      <div class="px-5 py-4">{props.children}</div>
    </div>
  );
}

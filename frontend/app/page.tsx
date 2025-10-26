import { Button } from "@/components/ui/button";
import TestComponent from "../components/TestComponent";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  return (
    <div>
      <h1>Hello, World!</h1>
      <p>Welcome to the home page!</p>
      <TestComponent />
      <br />
      We could use shadcn <br />
      Those are premade components, already styled and allow customization.
      <br />
      Here are some examples <br />
      link: https://ui.shadcn.com/docs/components
      <br />
      <Button>Click Me</Button>
      <Calendar
        mode="single"
        className="rounded-md border shadow-sm"
        captionLayout="dropdown"
      />
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
            <SelectItem value="grapes">Grapes</SelectItem>
            <SelectItem value="pineapple">Pineapple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

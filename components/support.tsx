import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { HelpCircle } from "lucide-react";
import { Button } from "./ui/button";

const SupportComponent = () => {
  return (
    <Popover>
      <PopoverTrigger className="border rounded-md p-3">
        <HelpCircle className="cursor-pointer w-4 h-4" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col space-y-2 mt-3 min-w-[280px]" align="end">
        <p className="text-sm font-medium">Gexart CRM Support</p>
        <p className="text-sm text-muted-foreground">
          Contact your system administrator for account access, HR, or billing help.
        </p>
        <Button variant="secondary" size="sm" asChild>
          <a href="mailto:support@gexart.com">support@gexart.com</a>
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default SupportComponent;

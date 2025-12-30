"use client";

import { useState } from "react";
import { Cpu, Loader2 } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function AddPlatformDialog() {
  const [open, setOpen] = useState(false);

const ENDPOINTS = {
  default: "TO DO just add record to db",
  scan: "http://localhost:8000/ansible/scan_platform",
  deploy: "http://localhost:8000/ansible/setup_agent",
}


  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
      host: values.hostname,
      extra_vars: {
        ansible_user: values.login,
        ansible_password: values.password,
        ansible_become_password: values.password,
      }
    }
      const response = await fetch("http://localhost:8000/ansible/setup_agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to setup agent");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Platform added successfully!", {
        description: "All tasks successfully completed.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error("Deployment failed", {
        description: error.message,
      });
    },
  });

  const form = useForm({
    defaultValues: {
      hostname: "",
      scanPlatform: false,
      deployAgent: false,
      login: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5! w-auto cursor-pointer">
          <Cpu className="size-5!" />
          <span className="text-base font-semibold">Add Platform</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Platform</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new platform.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6 py-4"
        >
          {/* Hostname Field */}
          <form.Field
            name="hostname"
            children={(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Hostname</Label>
                <Input
                  id={field.name}
                  required
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. server.name or 192.168.1.1"
                />
              </div>
            )}
          />

          {/* Options */}
          <div className="flex flex-col gap-3">
            <form.Field
              name="scanPlatform"
              children={(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(!!checked)}
                  />
                  <Label htmlFor={field.name} className="cursor-pointer">Scan Platform</Label>
                </div>
              )}
            />
            <form.Field
              name="deployAgent"
              children={(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(!!checked)}
                  />
                  <Label htmlFor={field.name} className="cursor-pointer">Deploy Agent</Label>
                </div>
              )}
            />
          </div>

          {/* Conditional Credentials Section */}
          <form.Subscribe
            selector={(state) => [state.values.scanPlatform, state.values.deployAgent]}
            children={([scan, deploy]) => {
              if (!scan && !deploy) return null;
              return (
                <div className="grid gap-4 border-t pt-4 animate-in fade-in slide-in-from-top-2">
                  <form.Field
                    name="login"
                    children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Sudo Login</Label>
                        <Input
                          id={field.name}
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="password"
                    children={(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Sudo Password</Label>
                        <Input
                          id={field.name}
                          type="password"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                </div>
              );
            }}
          />

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              "Add Platform"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
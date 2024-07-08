import React from "react";
import { RouteObject } from "react-router-dom";
import { GuiAppConfig } from "../supabase-types";

export interface AppListEntry {
  path: string;
  name: string;
}

export interface AppConfigMenuEntry {
  title: string;
  url: string;
}

export interface AppStatus {
  severity: "success" | "info" | "warning" | "error";
  message: string;
}

export interface GetStatusResponse {
  isPending: boolean;
  isInitialized: boolean;
  status: AppStatus;
}

export interface AppConfigPersistencePluginOptions {
  supabaseSchema: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export interface AppConfig<T = unknown> {
  appName: string;
  instanceName: string;
  description: string | undefined;
  path: string;
  options: T;
  menuEntries: AppConfigMenuEntry[];
  routes: RouteObject[];
  useAppStatus: () => GetStatusResponse;
  StatusComponent: React.ReactElement;
}

export type CreateAppConfigFactoryType = (app: GuiAppConfig) => AppConfig;

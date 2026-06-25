#!/usr/bin/env node

import { loadEnvFile } from "./infrastructure/config/load-env.js";
import { startAcpServer } from "./interfaces/acp/acp-server.js";

loadEnvFile();
startAcpServer();

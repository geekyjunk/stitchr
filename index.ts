#!/usr/bin/env node

const { Command } = require("commander");
const { parseFile } = require("./src/parser")

const program = new Command();

program
  .name("stitchr")
  .description("Stitchr CLI")

program
  .command("build")
  .description("Builds a file")
  .argument("[fileName]", "file name to build")
  .option("--show-graph", "show the dependency graph")
  .option("-o, --out <file>", "output bundle path", "dist/bundle.js")
  .action((name: string, options: { showGraph?: boolean; out?: string }) => {
    console.log("Building a file...")
    parseFile(name, { showGraph: options.showGraph, out: options.out });
  });

program.parse(process.argv);

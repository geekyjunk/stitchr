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
  .action((name: string, options: { showGraph?: boolean }) => {
    console.log("Building a file...")
    parseFile(name, { showGraph: options.showGraph });
    console.log('Built')
  });

program.parse(process.argv);

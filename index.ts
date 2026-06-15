#!/usr/bin/env node

const { Command } = require("commander");
// const pkg = require("./package.json");

const program = new Command();

program
  .name("stitchr")
  .description("Stitchr CLI")
  // .version(pkg.version);

program
  .command("build")
  .description("Builds a file")
  .argument("[fileName]", "file name to build")
  .action((name: string, options) => {
    console.log("Building a file...",options)
  });

program.parse(process.argv);

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
  .action((name: string, options: { [key: string]: any }) => {
    console.log("Building a file...")
    parseFile(name);
    console.log('Built')
  });

program.parse(process.argv);

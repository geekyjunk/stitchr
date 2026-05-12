#!/usr/bin/env node

const { Command } = require("commander");
const pkg = require("./package.json");

const program = new Command();

program
  .name("stitchr")
  .description("Stitchr CLI")
  .version(pkg.version);

program
  .command("hello")
  .description("Print a friendly greeting")
  .argument("[name]", "name to greet", "world")
  .option("-u, --uppercase", "shout the greeting")
  .action((name, options) => {
    let message = `Hello, ${name}!`;
    if (options.uppercase) {
      message = message.toUpperCase();
    }
    console.log(message);
  });

program.parse(process.argv);

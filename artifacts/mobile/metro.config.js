const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

const mobileModules = path.resolve(__dirname, "node_modules");
const rootModules = path.resolve(__dirname, "../../node_modules");

const extraNodeModules = {};

function addPackages(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    if (name.startsWith("@")) {
      const scopeDir = path.join(dir, name);
      for (const sub of fs.readdirSync(scopeDir)) {
        if (sub.startsWith(".")) continue;
        const pkgName = `${name}/${sub}`;
        if (!extraNodeModules[pkgName]) {
          try {
            extraNodeModules[pkgName] = fs.realpathSync(path.join(scopeDir, sub));
          } catch {
            extraNodeModules[pkgName] = path.join(scopeDir, sub);
          }
        }
      }
    } else {
      if (!extraNodeModules[name]) {
        try {
          extraNodeModules[name] = fs.realpathSync(path.join(dir, name));
        } catch {
          extraNodeModules[name] = path.join(dir, name);
        }
      }
    }
  }
}

addPackages(mobileModules);
addPackages(rootModules);

extraNodeModules["@"] = path.resolve(__dirname);

config.resolver.extraNodeModules = new Proxy(extraNodeModules, {
  get: (target, name) => {
    if (typeof name !== "string") return target[name];
    if (name === "@") return path.resolve(__dirname);
    if (name.startsWith("@/")) return path.resolve(__dirname, name.slice(2));
    if (target[name]) return target[name];
    const mobPath = path.join(mobileModules, name);
    if (fs.existsSync(mobPath)) {
      try { return fs.realpathSync(mobPath); } catch { return mobPath; }
    }
    const rootPath = path.join(rootModules, name);
    if (fs.existsSync(rootPath)) {
      try { return fs.realpathSync(rootPath); } catch { return rootPath; }
    }
    return undefined;
  },
});

module.exports = config;

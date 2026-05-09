{
  description = "Japan visa Next.js frontend dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_20
              yarn
              gnumake
              sops
              google-cloud-sdk
              docker-client
            ];

            shellHook = ''
              printf "frontend dev shell: node $(node --version), yarn $(yarn --version)\n"
              printf "run 'make help' for commands\n"
            '';
          };
        });
    };
}

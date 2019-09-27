Procedure
- Merge new code to master
- Update changelog.md
- Push to master
- Run 'apm publish major|minor|patch' command to publish to the Atom servers
  - This updates package.json with the right version
  - Creates a tag
  - Pushes it to master
  - then deploys to the atom servers
More info: https://flight-manual.atom.io/hacking-atom/sections/publishing/

To be able to publish, you need access to the pycom/pymakr-atom repo on github. Secondly, you need to create a personal access token for the command line. See these instructions:
https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line

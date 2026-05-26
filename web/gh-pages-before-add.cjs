module.exports = async function beforeAdd(git) {
  await git.rm(['.gitignore', 'web/.gitignore'])
}

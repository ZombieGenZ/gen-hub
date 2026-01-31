const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of project directories to monitor
const projects = [
    'client',
    'server',
    'status',
    'admin/admin-panel',
    'admin/database-panel',
    'admin/feature-flag-panel',
    'admin/resources-panel'
];

try {
    // Get staged files
    // "git diff --cached --name-only" lists files staged for commit
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' }).split('\n').filter(Boolean);

    const projectsToBump = new Set();

    stagedFiles.forEach(file => {
        projects.forEach(project => {
            // Check if the file belongs to one of the project folders
            // We use path.posix.sep to ensure forward slashes on matches or just string checks
            // Since git output usually returns standardized paths (forward slashes), checks should be fine.
            if (file.startsWith(project + '/')) {
                projectsToBump.add(project);
            }
        });
    });

    if (projectsToBump.size === 0) {
        console.log('No changes in monitored projects. skipping version bump.');
        process.exit(0);
    }

    projectsToBump.forEach(project => {
        const projectDir = path.join(process.cwd(), project);
        const pkgPath = path.join(projectDir, 'package.json');

        if (fs.existsSync(pkgPath)) {
            console.log(`[Auto-Bump] Bumping version for ${project}...`);
            try {
                // use npm version patch to increment version in package.json
                // --no-git-tag-version: updates file but doesn't commit or tag
                execSync('npm version patch --no-git-tag-version --force', {
                    cwd: projectDir,
                    stdio: 'inherit'
                });

                // Add the updated package.json back to the staging area so it gets included in the current commit
                execSync(`git add "${pkgPath}"`, { cwd: process.cwd(), stdio: 'inherit' });

                console.log(`[Auto-Bump] Successfully bumped ${project}.`);
            } catch (e) {
                console.error(`[Auto-Bump] Failed to bump version for ${project}.`, e);
                // We do not exit with error to not block the commit, but warn the user.
                // Or should we block? Ideally yes, but maybe best to let it pass if npm fails?
                // If npm fails, it might be syntax error in package.json.
            }
        }
    });

} catch (error) {
    console.error('[Auto-Bump] Error during version bump script:', error);
    // Do not block commit on script error unless critical
    process.exit(1);
}

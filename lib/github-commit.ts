// Коммит нескольких файлов в репозиторий сайта ОДНИМ коммитом — через Git
// Data API (blob → tree → commit → ref), а не Contents API (тот делает
// отдельный коммит на каждый файл). Это то, чем "публикация" из редактора
// доставляет новый контент на задеплоенный (статический) сайт: push в main
// триггерит обычный автодеплой Vercel.

import { Octokit } from "@octokit/rest";

export type CommitFile = {
  /** Путь от корня репозитория, например "content/channel-posts.json". */
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
};

export type CommitResult = { sha: string; htmlUrl: string };

function client(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN не задан в env");
  return new Octokit({ auth: token });
}

function repoInfo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!owner || !repo) throw new Error("GITHUB_OWNER/GITHUB_REPO не заданы в env");
  return { owner, repo, branch };
}

/**
 * Текущее содержимое файла в репозитории (напрямую из GitHub, не из
 * локальной ФС serverless-функции — та отражает только тот коммит, что был
 * задеплоен последним, и может быть на несколько публикаций позади). Нужен
 * перед тем, как дописать в JSON-стор новую запись: без этого два publish
 * подряд, сделанные быстрее, чем успевает пройти редеплой, читали бы один и
 * тот же устаревший локальный снимок и второй коммит тихо затирал бы первый.
 * null — файла ещё нет в репозитории.
 */
export async function getRepoFile(path: string): Promise<string | null> {
  const octokit = client();
  const { owner, repo, branch } = repoInfo();
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(data) || !("content" in data)) return null;
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

export async function commitFiles({
  message,
  files,
}: {
  message: string;
  files: CommitFile[];
}): Promise<CommitResult> {
  if (files.length === 0) throw new Error("commitFiles: пустой список файлов");

  const octokit = client();
  const { owner, repo, branch } = repoInfo();

  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const baseCommitSha = ref.object.sha;

  const { data: baseCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: baseCommitSha,
  });
  const baseTreeSha = baseCommit.tree.sha;

  const blobs = await Promise.all(
    files.map((f) =>
      octokit.git.createBlob({
        owner,
        repo,
        content: f.content,
        encoding: f.encoding,
      })
    )
  );

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: files.map((f, i) => ({
      path: f.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blobs[i].data.sha,
    })),
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [baseCommitSha],
  });

  // force: false — честная ошибка при гонке (кто-то успел закоммитить между
  // getRef и этим вызовом), а не тихая перезапись чужого коммита.
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
    force: false,
  });

  return {
    sha: newCommit.sha,
    htmlUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
  };
}

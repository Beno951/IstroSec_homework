import { test, expect } from '@playwright/test';

const API_BASE_URL = 'https://jsonplaceholder.typicode.com';

type Post = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

/*
 * The highest-value cases - CRUD (create, read, update, delete).
 * We test the full lifecycle of a resource - the most important thing a user can do with an API.
 * We also test filtering (also important for real-world usage) and invalid IDs (negative scenario).
 */

test.describe('JSONPlaceholder posts API', () => {
  
  // Verifies the posts list and resource shape
  test('lists posts with the expected resource shape', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/posts`);

    expect(response.status()).toBe(200);

    const posts = (await response.json()) as Post[];
    expect(posts.length).toBeGreaterThan(0);
    console.log(`Number of posts returned: ${posts.length}`);
    console.log(posts[0]);
    expect(posts[0]).toEqual(
      expect.objectContaining({
        userId: expect.any(Number),
        id: expect.any(Number),
        title: expect.any(String),
        body: expect.any(String),
      }),
    );
  });

  // Verifies userId filtering, an important way to retrieve a user's posts.
  test('filters posts by userId', async ({ request }) => {
    const userId = 1;
    const response = await request.get(`${API_BASE_URL}/posts`, {
      params: { userId },
    });

    expect(response.status()).toBe(200);
    const posts = (await response.json()) as Post[];
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((post) => post.userId === userId)).toBe(true);
  });

  // Verifies retrieval of an individual post, the core read-by-ID operation.
  test('gets a random post by id', async ({ request }) => {
    const randomPostId = await Math.floor(Math.random() * 100) + 1; // Random post ID between 1 and 100
    const response = await request.get(`${API_BASE_URL}/posts/${randomPostId}`);

    expect(response.status()).toBe(200);
    
    const randomPost = await response.json();
    console.log(`Response for post ID ${randomPostId}:`, randomPost);
    expect(randomPost.id).toEqual(randomPostId);
  });

  // Verifies invalid IDs return 404 so missing resources are handled correctly.
  test('returns 404 for a post that does not exist', async ({ request }) => {
    for (const invalidId of ["999999", "0", "-1", "1abc"]) {
      console.log(`Testing invalid post ID: ${invalidId}`);
      const response = await request.get(`${API_BASE_URL}/posts/${invalidId}`);
      expect(response.status()).toBe(404);
    }
  });

  // Verifies post creation returns the submitted fields and generated ID.
  test('creates a post and returns its fields and generated id', async ({ request }) => {
    const newPost = {
      userId: 1,
      title: 'API CRUD test post',
      body: 'Created by the Task 2 API test.',
    };
    const response = await request.post(`${API_BASE_URL}/posts`, {
      data: newPost,
    });

    expect(response.status()).toBe(201);
    const createdPost = (await response.json()) as Post;
    expect(createdPost).toEqual({
      ...newPost,
      id: 101,
    });
  });

  // Verifies PATCH changes the requested field without losing other post data.
  test('partially updates a post and preserves its other fields', async ({ request }) => {
    const originalResponse = await request.get(`${API_BASE_URL}/posts/1`);
    expect(originalResponse.status()).toBe(200);
    const originalPost = (await originalResponse.json()) as Post;

    const response = await request.patch(`${API_BASE_URL}/posts/1`, {
      data: { title: 'Updated API CRUD test title' },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      userId: originalPost.userId,
      id: originalPost.id,
      title: 'Updated API CRUD test title',
      body: originalPost.body,
    });
  });

  // Verifies the delete operation succeeds, covering the final CRUD action.
  test('deletes a post successfully', async ({ request }) => {
    const response = await request.delete(`${API_BASE_URL}/posts/1`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({});
  });
});

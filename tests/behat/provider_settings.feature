@aiprovider @aiprovider_pollinations
Feature: Pollinations AI provider smoke test
  In order to ensure the plugin doesn't break the site
  As an administrator
  I need basic site functionality to work

  Background:
    Given I log in as "admin"

  Scenario: Site administration loads with plugin installed
    When I am on site administration page
    Then I should see "Plugins"

  Scenario: Admin can access AI provider management
    When I am on site administration page
    And I follow "Notifications"
    Then I should see "Moodle"

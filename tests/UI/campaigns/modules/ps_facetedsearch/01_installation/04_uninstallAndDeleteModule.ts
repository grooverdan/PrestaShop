// Import utils
import testContext from '@utils/testContext';

// Import commonTests
import loginCommon from '@commonTests/BO/loginBO';

// Import pages
// Import BO pages
import {moduleManager as moduleManagerPage} from '@pages/BO/modules/moduleManager';
// Import FO pages
import {homePage} from '@pages/FO/classic/home';

import {expect} from 'chai';
import type {BrowserContext, Page} from 'playwright';
import {
  boDashboardPage,
  dataCategories,
  dataModules,
  foClassicCategoryPage,
  utilsFile,
  utilsPlaywright,
} from '@prestashop-core/ui-testing';

const baseContext: string = 'modules_ps_facetedsearch_installation_uninstallAndDeleteModule';

describe('Faceted search module - Uninstall and delete module', async () => {
  let browserContext: BrowserContext;
  let page: Page;

  // before and after functions
  before(async function () {
    browserContext = await utilsPlaywright.createBrowserContext(this.browser);
    page = await utilsPlaywright.newTab(browserContext);
  });

  after(async () => {
    await utilsPlaywright.closeBrowserContext(browserContext);
    await utilsFile.deleteFile('module.zip');
  });

  it('should login in BO', async function () {
    await loginCommon.loginBO(this, page);
  });

  it('should go to \'Modules > Module Manager\' page', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'goToModuleManagerPage', baseContext);

    await boDashboardPage.goToSubMenu(
      page,
      boDashboardPage.modulesParentLink,
      boDashboardPage.moduleManagerLink,
    );
    await moduleManagerPage.closeSfToolBar(page);

    const pageTitle = await moduleManagerPage.getPageTitle(page);
    expect(pageTitle).to.contains(moduleManagerPage.pageTitle);
  });

  it(`should search the module ${dataModules.psFacetedSearch.name}`, async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'searchModule', baseContext);

    const isModuleVisible = await moduleManagerPage.searchModule(page, dataModules.psFacetedSearch);
    expect(isModuleVisible).to.eq(true);
  });

  it('should display the uninstall modal and cancel it', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'resetModuleAndCancel', baseContext);

    const textResult = await moduleManagerPage.setActionInModule(page, dataModules.psFacetedSearch, 'uninstall', true);
    expect(textResult).to.eq('');

    const isModuleVisible = await moduleManagerPage.isModuleVisible(page, dataModules.psFacetedSearch);
    expect(isModuleVisible).to.eq(true);

    const isModalVisible = await moduleManagerPage.isModalActionVisible(page, dataModules.psFacetedSearch, 'uninstall');
    expect(isModalVisible).to.eq(false);

    const dirExists = await utilsFile.doesFileExist(`${utilsFile.getRootPath()}/modules/${dataModules.psFacetedSearch.tag}/`);
    expect(dirExists).to.eq(true);
  });

  it('should uninstall the module', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'resetModule', baseContext);

    const successMessage = await moduleManagerPage.setActionInModule(page, dataModules.psFacetedSearch, 'uninstall', false, true);
    expect(successMessage).to.eq(moduleManagerPage.uninstallModuleSuccessMessage(dataModules.psFacetedSearch.tag));

    // Check the directory `modules/dataModules.psFacetedSearch.tag`
    const dirExists = await utilsFile.doesFileExist(`${utilsFile.getRootPath()}/modules/${dataModules.psFacetedSearch.tag}/`);
    expect(dirExists).to.eq(false);
  });

  it('should go to Front Office', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'goToFo', baseContext);

    page = await moduleManagerPage.viewMyShop(page);
    await homePage.changeLanguage(page, 'en');

    const isHomePage = await homePage.isHomePage(page);
    expect(isHomePage).to.eq(true);
  });

  it('should go to the category Page', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'goToCategoryPage', baseContext);

    await homePage.goToCategory(page, dataCategories.clothes.id);

    const pageTitle = await homePage.getPageTitle(page);
    expect(pageTitle).to.equal(dataCategories.clothes.name);
  });

  it(`should check that ${dataModules.psFacetedSearch.name} is not present`, async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'checkModuleNotPresent', baseContext);

    const hasFilters = await foClassicCategoryPage.hasSearchFilters(page);
    expect(hasFilters).to.eq(false);
  });

  describe(`POST-CONDITION : Install the module ${dataModules.psFacetedSearch.name}`, async () => {
    it('should go back to Back Office', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'returnToBo', baseContext);

      page = await foClassicCategoryPage.closePage(browserContext, page, 0);

      const pageTitle = await moduleManagerPage.getPageTitle(page);
      expect(pageTitle).to.contains(moduleManagerPage.pageTitle);
    });

    it(`should download the zip of the module '${dataModules.psFacetedSearch.name}'`, async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'downloadModule', baseContext);

      await utilsFile.downloadFile(dataModules.psFacetedSearch.releaseZip, 'module.zip');

      const found = await utilsFile.doesFileExist('module.zip');
      expect(found).to.eq(true);
    });

    it(`should upload the module '${dataModules.psFacetedSearch.name}'`, async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'uploadModule', baseContext);

      const successMessage = await moduleManagerPage.uploadModule(page, 'module.zip');
      expect(successMessage).to.eq(moduleManagerPage.uploadModuleSuccessMessage);
    });

    it('should close upload module modal', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'closeModal', baseContext);

      const isModalNotVisible = await moduleManagerPage.closeUploadModuleModal(page);
      expect(isModalNotVisible).to.eq(true);
    });

    it(`should search the module '${dataModules.psFacetedSearch.name}'`, async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'checkModulePresent', baseContext);

      const isModuleVisible = await moduleManagerPage.searchModule(page, dataModules.psFacetedSearch);
      expect(isModuleVisible, 'Module is not visible!').to.eq(true);
    });
  });
});
